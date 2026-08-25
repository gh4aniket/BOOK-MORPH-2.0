const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const IMAGE_DIR = path.join(UPLOAD_ROOT, 'images');
const PDF_DIR = path.join(UPLOAD_ROOT, 'pdfs');

[UPLOAD_ROOT, IMAGE_DIR, PDF_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
const ALLOWED_PDF_TYPES = ['application/pdf'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (ALLOWED_PDF_TYPES.includes(file.mimetype)) {
      cb(null, PDF_DIR);
    } else {
      cb(null, IMAGE_DIR);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'page-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_PDF_TYPES];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP images and PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per file (PDFs can be larger than images)
    files: 30 // a "book" can have many pages
  }
});

module.exports = upload;
module.exports.UPLOAD_ROOT = UPLOAD_ROOT;
module.exports.IMAGE_DIR = IMAGE_DIR;
module.exports.PDF_DIR = PDF_DIR;
module.exports.ALLOWED_IMAGE_TYPES = ALLOWED_IMAGE_TYPES;
module.exports.ALLOWED_PDF_TYPES = ALLOWED_PDF_TYPES;
