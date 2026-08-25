const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { generateVisuals } = require('../controllers/visualController');

router.post('/', asyncHandler(generateVisuals));

module.exports = router;
