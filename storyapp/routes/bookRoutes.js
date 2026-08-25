const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  createBook,
  createBookFromText,
  listBooks,
  getBook,
  getBookStatus,
  deleteBook,
  reanalyzeBook,
  regenerateVisuals
} = require('../controllers/bookController');

// Create a book by uploading one or more images/PDFs.
// Field name 'files' supports multiple files in one request.
router.post('/', upload.array('files', 30), asyncHandler(createBook));

// Create a book directly from raw text (skips OCR entirely).
router.post('/text', asyncHandler(createBookFromText));

// List all of the current user's books.
router.get('/', asyncHandler(listBooks));

// Lightweight status polling (pending/completed/failed).
router.get('/:id/status', asyncHandler(getBookStatus));

// Full book detail (scenes, dialogue, images) for viewing/playing.
router.get('/:id', asyncHandler(getBook));

// Re-run analysis + visuals (e.g. after editing rawText, or retry on failure).
router.post('/:id/reanalyze', asyncHandler(reanalyzeBook));

// Re-run just the visuals stage.
router.post('/:id/regenerate-visuals', asyncHandler(regenerateVisuals));

router.delete('/:id', asyncHandler(deleteBook));

module.exports = router;
