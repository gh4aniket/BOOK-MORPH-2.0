const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');
const { fromPath } = require('pdf2pic');

const USE_MOCK = !process.env.GOOGLE_VISION_KEY || process.env.GOOGLE_VISION_KEY === 'your_google_vision_key_here';

const MOCK_TEXT = `Once upon a time, in a dark forest filled with mist and shadows, there lived a young girl named Alice. She wandered through the woods, her heart pounding with fear.

"Where am I?" Alice whispered, her voice trembling.

Suddenly, a white rabbit appeared before her, his pocket watch gleaming in the moonlight.

"We're late!" the Rabbit cried, his eyes wide with panic. "The Queen will have our heads!"

Alice stared in disbelief. "But I don't understand. Late for what?"

"For the tea party, of course!" the Rabbit exclaimed, hopping frantically. "Follow me, quickly!"

And so Alice followed the mysterious rabbit deeper into the enchanted forest, not knowing what adventures awaited her.`;

/**
 * Extract text from a single image file on disk.
 */
const extractTextFromImage = async (imagePath) => {
  try {
    if (USE_MOCK) {
      console.log(`Using mock OCR for image: ${path.basename(imagePath)}`);
      await new Promise((resolve) => setTimeout(resolve, 800));

      return {
        success: true,
        text: MOCK_TEXT,
        mock: true
      };
    }

    const result = await Tesseract.recognize(imagePath, 'eng', {
      logger: () => {} // silence per-word logger spam; flip on for debugging
    });

    return {
      success: true,
      text: result.data.text,
      mock: false
    };
  } catch (error) {
    console.error('OCR Error (image):', error);
    return {
      success: false,
      text: '',
      error: error.message,
      mock: false
    };
  }
};

/**
 * Rasterize every page of a PDF into temp images, then OCR each page.
 * PDFs are treated as scanned documents (image-based OCR), per design.
 */
const extractTextFromPdf = async (pdfPath, tempDir) => {
  try {
    if (USE_MOCK) {
      console.log(`Using mock OCR for PDF: ${path.basename(pdfPath)}`);
      await new Promise((resolve) => setTimeout(resolve, 1200));

      return {
        success: true,
        pages: [{ pageNumber: 1, text: MOCK_TEXT }],
        mock: true
      };
    }

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const baseName = path.basename(pdfPath, path.extname(pdfPath));
    const convert = fromPath(pdfPath, {
      density: 200,
      saveFilename: `${baseName}-page`,
      savePath: tempDir,
      format: 'png',
      width: 1600,
      height: 2200
    });

    // bulk(-1) converts every page
    const converted = await convert.bulk(-1, { responseType: 'image' });

    const pages = [];
    for (let i = 0; i < converted.length; i++) {
      const pageImagePath = converted[i].path;
      const ocrResult = await extractTextFromImage(pageImagePath);

      pages.push({
        pageNumber: i + 1,
        text: ocrResult.success ? ocrResult.text : ''
      });

      // Clean up the rasterized temp page image
      fs.unlink(pageImagePath, () => {});
    }

    return {
      success: true,
      pages,
      mock: false
    };
  } catch (error) {
    console.error('OCR Error (PDF):', error);
    return {
      success: false,
      pages: [],
      error: error.message,
      mock: false
    };
  }
};

/**
 * Process a mixed batch of uploaded files (images and/or PDFs), in the
 * order provided, and return per-source extracted text plus the combined
 * full text for the whole "book".
 *
 * @param {Array<{path: string, originalname: string, mimetype: string}>} files
 */
const extractTextFromFiles = async (files) => {
  const tempDir = path.join(__dirname, '..', 'uploads', 'temp', `pdf-${Date.now()}`);
  const sourceResults = [];
  let anyMock = false;
  let pageCounter = 0;

  try {
    for (const file of files) {
      const isPdf = file.mimetype === 'application/pdf';

      if (isPdf) {
        const pdfResult = await extractTextFromPdf(file.path, tempDir);
        if (pdfResult.mock) anyMock = true;

        if (!pdfResult.success) {
          sourceResults.push({
            originalName: file.originalname,
            storedPath: relativeUploadPath(file.path),
            mimeType: file.mimetype,
            pageNumber: ++pageCounter,
            extractedText: '',
            error: pdfResult.error
          });
          continue;
        }

        for (const page of pdfResult.pages) {
          pageCounter++;
          sourceResults.push({
            originalName: `${file.originalname} (page ${page.pageNumber})`,
            storedPath: relativeUploadPath(file.path),
            mimeType: file.mimetype,
            pageNumber: pageCounter,
            extractedText: page.text
          });
        }
      } else {
        const imgResult = await extractTextFromImage(file.path);
        if (imgResult.mock) anyMock = true;
        pageCounter++;

        sourceResults.push({
          originalName: file.originalname,
          storedPath: relativeUploadPath(file.path),
          mimeType: file.mimetype,
          pageNumber: pageCounter,
          extractedText: imgResult.success ? imgResult.text : '',
          error: imgResult.success ? undefined : imgResult.error
        });
      }
    }

    const combinedText = sourceResults
      .map((s) => s.extractedText)
      .filter((t) => t && t.trim().length > 0)
      .join('\n\n');

    return {
      success: true,
      sourceFiles: sourceResults,
      combinedText,
      mock: anyMock
    };
  } finally {
    // Best-effort cleanup of the temp rasterization directory
    fs.rm(tempDir, { recursive: true, force: true }, () => {});
  }
};

const relativeUploadPath = (absolutePath) => {
  const uploadsRoot = path.join(__dirname, '..', 'uploads');
  return path.relative(uploadsRoot, absolutePath).split(path.sep).join('/');
};

// Backwards-compatible single-image export name used by older callers.
const extractText = extractTextFromImage;

module.exports = {
  extractText,
  extractTextFromImage,
  extractTextFromPdf,
  extractTextFromFiles
};
