const { analyzeStory } = require('../services/nlpService');

/**
 * POST /api/analyze
 * Standalone NLP stage: takes raw text and returns structured scenes
 * (setting, mood, characters, dialogue with emotion/gender/age) without
 * creating a Book. The frontend derives its own Web Speech API parameters
 * (pitch/rate/voice selection) from each dialogue line's gender/age/emotion.
 */
const analyzeText = async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No text provided for analysis'
    });
  }

  const analysisResult = await analyzeStory(text);

  if (!analysisResult.success) {
    return res.status(500).json({
      success: false,
      message: 'Story analysis failed',
      error: analysisResult.error
    });
  }

  res.json({
    success: true,
    message: 'Story analyzed successfully',
    scenes: analysisResult.scenes,
    mock: analysisResult.mock || false
  });
};

module.exports = {
  analyzeText
};
