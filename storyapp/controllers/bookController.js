const path = require('path');
const fs = require('fs');
const Book = require('../models/Book');
const { getDefaultUserId } = require('../utils/defaultUser');
const {
  runExtractionStage,
  runAnalysisStage,
  runVisualsStage,
  runFullPipeline
} = require('../services/bookPipelineService');

/**
 * POST /api/books
 * Upload one or more images and/or PDFs to create a new book, then kick off
 * the full OCR -> NLP -> Visuals pipeline in the background.
 *
 * Responds immediately with the created (pending) book so the frontend can
 * start polling GET /api/books/:id/status.
 */
const createBook = async (req, res) => {
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files provided. Upload at least one image or PDF.'
    });
  }

  const userId = await getDefaultUserId();

  const sourceFiles = files.map((file, idx) => ({
    originalName: file.originalname,
    storedPath: path.relative(path.join(__dirname, '..', 'uploads'), file.path).split(path.sep).join('/'),
    mimeType: file.mimetype,
    pageNumber: idx + 1,
    extractedText: ''
  }));

  const hasPdf = files.some((f) => f.mimetype === 'application/pdf');
  const hasImage = files.some((f) => f.mimetype !== 'application/pdf');
  const sourceType = hasPdf && hasImage ? 'mixed' : hasPdf ? 'pdf' : 'image';

  const book = await Book.create({
    userId,
    title: req.body.title || 'Untitled Story',
    sourceFiles,
    sourceType,
    status: 'uploaded',
    statusMessage: 'Files uploaded, processing will begin shortly...'
  });

  // Fire-and-forget background pipeline (async option 3, with each stage
  // still independently callable/re-runnable via the routes below).
  runFullPipeline(book._id.toString());

  res.status(201).json({
    success: true,
    message: 'Book created. Processing has started.',
    book
  });
};

/**
 * POST /api/books/text
 * Create a book directly from raw text (no OCR needed), then run the
 * remaining pipeline stages (analysis + visuals) in the background.
 */
const createBookFromText = async (req, res) => {
  const { text, title } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({
      success: false,
      message: 'No text provided'
    });
  }

  const userId = await getDefaultUserId();

  const book = await Book.create({
    userId,
    title: title || 'Untitled Story',
    sourceType: 'text',
    rawText: text,
    status: 'analyzing_story',
    statusMessage: 'Analyzing story structure and scenes...'
  });

  (async () => {
    try {
      let current = await runAnalysisStage(book._id.toString());
      if (current.status === 'failed') return;
      await runVisualsStage(book._id.toString());
    } catch (error) {
      console.error(`Pipeline error for book ${book._id}:`, error);
      await Book.findByIdAndUpdate(book._id, { status: 'failed', error: error.message });
    }
  })();

  res.status(201).json({
    success: true,
    message: 'Book created from text. Processing has started.',
    book
  });
};

/**
 * GET /api/books
 * List all books for the current (default) user, newest first.
 * Supports lightweight pagination via ?page=&limit=.
 */
const listBooks = async (req, res) => {
  const userId = await getDefaultUserId();

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const [books, total] = await Promise.all([
    Book.find({ userId })
      .select('-sourceFiles.extractedText') // keep list responses light
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Book.countDocuments({ userId })
  ]);

  res.json({
    success: true,
    books,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
};

/**
 * GET /api/books/:id
 * Full book detail, including scenes/dialogue/images — used by the
 * StoryViewer to play/view the book.
 */
const getBook = async (req, res) => {
  const userId = await getDefaultUserId();
  const book = await Book.findOne({ _id: req.params.id, userId });

  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }

  res.json({ success: true, book });
};

/**
 * GET /api/books/:id/status
 * Lightweight polling endpoint for the frontend to check whether a book
 * has finished processing. `simpleStatus` is what the UI should branch on:
 *   - 'pending'   -> still processing, keep polling, book not clickable
 *   - 'completed' -> done, book is now clickable to view/play
 *   - 'failed'    -> something went wrong, show book.error
 */
const getBookStatus = async (req, res) => {
  const userId = await getDefaultUserId();
  const book = await Book.findOne({ _id: req.params.id, userId }).select(
    'status statusMessage error mock title simpleStatus createdAt updatedAt'
  );

  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }

  res.json({
    success: true,
    simpleStatus: book.simpleStatus,
    status: book.status,
    statusMessage: book.statusMessage,
    error: book.error,
    book
  });
};

/**
 * DELETE /api/books/:id
 * Deletes the book document and its associated uploaded files.
 */
const deleteBook = async (req, res) => {
  const userId = await getDefaultUserId();
  const book = await Book.findOneAndDelete({ _id: req.params.id, userId });

  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }

  const uploadsRoot = path.join(__dirname, '..', 'uploads');
  for (const sf of book.sourceFiles) {
    const absPath = path.join(uploadsRoot, sf.storedPath);
    fs.unlink(absPath, () => {}); // best-effort, ignore missing files
  }

  res.json({ success: true, message: 'Book deleted' });
};

/**
 * POST /api/books/:id/reanalyze
 * Re-run just the NLP + visuals stages (e.g. after rawText was edited, or
 * to retry after a failure) without re-uploading/re-OCRing files.
 */
const reanalyzeBook = async (req, res) => {
  const userId = await getDefaultUserId();
  const book = await Book.findOne({ _id: req.params.id, userId });

  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }

  if (typeof req.body.rawText === 'string' && req.body.rawText.trim()) {
    book.rawText = req.body.rawText;
    await book.save();
  }

  res.json({ success: true, message: 'Reanalysis started', book });

  (async () => {
    try {
      const current = await runAnalysisStage(book._id.toString());
      if (current.status === 'failed') return;
      await runVisualsStage(book._id.toString());
    } catch (error) {
      console.error(`Reanalysis error for book ${book._id}:`, error);
      await Book.findByIdAndUpdate(book._id, { status: 'failed', error: error.message });
    }
  })();
};

/**
 * POST /api/books/:id/regenerate-visuals
 * Re-run just the image-generation stage (e.g. images failed/were mocked
 * and the user now wants to retry with a real key configured).
 */
const regenerateVisuals = async (req, res) => {
  const userId = await getDefaultUserId();
  const book = await Book.findOne({ _id: req.params.id, userId });

  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }

  res.json({ success: true, message: 'Visual regeneration started', book });

  runVisualsStage(book._id.toString()).catch((error) => {
    console.error(`Visual regeneration error for book ${book._id}:`, error);
    Book.findByIdAndUpdate(book._id, { status: 'failed', error: error.message }).catch(() => {});
  });
};

module.exports = {
  createBook,
  createBookFromText,
  listBooks,
  getBook,
  getBookStatus,
  deleteBook,
  reanalyzeBook,
  regenerateVisuals
};
