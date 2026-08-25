const Book = require('../models/Book');
const { extractTextFromFiles } = require('./ocrService');
const { analyzeStory } = require('./nlpService');
const { generateImagesForScenes } = require('./imageService');

/**
 * Stage 1: OCR. Reads the book's stored source files from disk, extracts
 * text, and saves it onto the Book document.
 */
const runExtractionStage = async (bookId) => {
  const book = await Book.findById(bookId);
  if (!book) throw new Error('Book not found');

  book.status = 'extracting_text';
  book.statusMessage = 'Extracting text from uploaded pages...';
  await book.save();

  const files = book.sourceFiles.map((sf) => ({
    path: require('path').join(__dirname, '..', 'uploads', sf.storedPath),
    originalname: sf.originalName,
    mimetype: sf.mimeType
  }));

  const ocrResult = await extractTextFromFiles(files);

  if (!ocrResult.success || !ocrResult.combinedText.trim()) {
    book.status = 'failed';
    book.error = ocrResult.error || 'No text could be extracted from the uploaded files';
    await book.save();
    return book;
  }

  // Merge OCR text back per-page (sourceFiles order may have expanded for
  // multi-page PDFs, so rebuild the array from ocrResult).
  book.sourceFiles = ocrResult.sourceFiles.map((s) => ({
    originalName: s.originalName,
    storedPath: s.storedPath,
    mimeType: s.mimeType,
    pageNumber: s.pageNumber,
    extractedText: s.extractedText,
    error: s.error || null
  }));
  book.rawText = ocrResult.combinedText;
  book.mock.ocr = ocrResult.mock;
  await book.save();

  return book;
};

/**
 * Stage 2: NLP scene analysis. Requires rawText to already be present
 * (either from the extraction stage, or supplied directly for text-only
 * books).
 */
const runAnalysisStage = async (bookId) => {
  const book = await Book.findById(bookId);
  if (!book) throw new Error('Book not found');

  if (!book.rawText || !book.rawText.trim()) {
    book.status = 'failed';
    book.error = 'No text available to analyze';
    await book.save();
    return book;
  }

  book.status = 'analyzing_story';
  book.statusMessage = 'Analyzing story structure and scenes...';
  await book.save();

  const analysisResult = await analyzeStory(book.rawText);

  if (!analysisResult.success) {
    book.status = 'failed';
    book.error = analysisResult.error || 'Story analysis failed';
    await book.save();
    return book;
  }

  book.scenes = analysisResult.scenes;
  book.mock.nlp = analysisResult.mock;
  if (!book.title || book.title === 'Untitled Story') {
    book.title = deriveTitle(analysisResult.scenes);
  }
  await book.save();

  return book;
};

/**
 * Stage 3: per-scene representative images.
 */
const runVisualsStage = async (bookId) => {
  const book = await Book.findById(bookId);
  if (!book) throw new Error('Book not found');

  if (!book.scenes || book.scenes.length === 0) {
    book.status = 'failed';
    book.error = 'No scenes available to generate visuals for';
    await book.save();
    return book;
  }

  book.status = 'generating_visuals';
  book.statusMessage = 'Generating scene visuals...';
  await book.save();

  const imageResults = await generateImagesForScenes(book.scenes);

  let anyMock = false;
  book.scenes = book.scenes.map((scene, idx) => {
    const result = imageResults.find((r) => r.sceneIndex === idx);
    if (result?.mock) anyMock = true;
    return {
      ...scene.toObject ? scene.toObject() : scene,
      imageUrl: result?.imageUrl || null,
      imageMock: Boolean(result?.mock)
    };
  });
  book.mock.images = anyMock;

  book.status = 'ready';
  book.statusMessage = 'Your storybook is ready!';
  await book.save();

  return book;
};

/**
 * Runs all three stages back-to-back in the background. Caller does NOT
 * await this for the HTTP response — it's fired-and-forgotten, with the
 * Book document acting as the progress/status store the frontend polls.
 */
const runFullPipeline = async (bookId) => {
  try {
    let book = await runExtractionStage(bookId);
    if (book.status === 'failed') return;

    book = await runAnalysisStage(bookId);
    if (book.status === 'failed') return;

    await runVisualsStage(bookId);
  } catch (error) {
    console.error(`Pipeline error for book ${bookId}:`, error);
    await Book.findByIdAndUpdate(bookId, {
      status: 'failed',
      error: error.message
    });
  }
};

const deriveTitle = (scenes) => {
  const firstSetting = scenes[0]?.setting;
  if (firstSetting) {
    return firstSetting.length > 60 ? `${firstSetting.slice(0, 57)}...` : firstSetting;
  }
  return 'Untitled Story';
};

module.exports = {
  runExtractionStage,
  runAnalysisStage,
  runVisualsStage,
  runFullPipeline
};
