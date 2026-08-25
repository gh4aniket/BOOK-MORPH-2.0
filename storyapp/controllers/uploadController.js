const path = require('path');
const { extractTextFromFiles } = require('../services/ocrService');

/**
 * POST /api/upload
 * Standalone OCR stage: accepts one or more images and/or PDFs and returns
 * extracted text, without creating a Book. Useful for a "preview extracted
 * text before creating a book" flow on the frontend.
 */
const uploadImages = async (req, res) => {
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files provided'
    });
  }

  const ocrResult = await extractTextFromFiles(files);

  if (!ocrResult.success) {
    return res.status(500).json({
      success: false,
      message: 'OCR processing failed',
      error: ocrResult.error
    });
  }

  res.json({
    success: true,
    message: 'Files uploaded and processed successfully',
    extractedText: ocrResult.combinedText,
    sourceFiles: ocrResult.sourceFiles,
    mock: ocrResult.mock
  });
};

module.exports = {
  uploadImages
};
