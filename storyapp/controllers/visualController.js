const { generateImagesForScenes } = require('../services/imageService');

/**
 * POST /api/visuals
 * Standalone visuals stage: takes scenes and returns a generated/looked-up
 * image per scene, without creating a Book.
 */
const generateVisuals = async (req, res) => {
  const { scenes } = req.body;

  if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No scenes provided for visual generation'
    });
  }

  const imageResults = await generateImagesForScenes(scenes);

  res.json({
    success: true,
    message: 'Visuals generated successfully',
    images: imageResults,
    mock: imageResults[0]?.mock || false
  });
};

module.exports = {
  generateVisuals
};
