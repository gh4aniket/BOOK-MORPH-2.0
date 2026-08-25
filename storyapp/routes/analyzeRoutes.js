const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { analyzeText } = require('../controllers/analyzeController');

router.post('/', asyncHandler(analyzeText));

module.exports = router;
