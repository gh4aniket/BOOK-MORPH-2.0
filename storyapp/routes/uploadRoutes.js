const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { asyncHandler } = require('../middleware/errorHandler');
const { uploadImages } = require('../controllers/uploadController');

// Accept multiple images and/or PDFs under the 'files' field.
router.post('/', upload.array('files', 30), asyncHandler(uploadImages));

module.exports = router;
