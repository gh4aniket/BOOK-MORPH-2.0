const { GoogleGenerativeAI } = require('@google/generative-ai');

const USE_MOCK = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here';

const genAI = USE_MOCK ? null : new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MOCK_SCENES = [
  {
    setting: 'Dark misty forest at night',
    mood: 'mysterious and fearful',
    characters: ['Alice'],
    dialogue: [
      {
        speaker: 'Narrator',
        line: 'Once upon a time, in a dark forest filled with mist and shadows, there lived a young girl named Alice. She wandered through the woods, her heart pounding with fear.',
        emotion: 'neutral',
        gender: 'female',
        age: 'adult'
      },
      {
        speaker: 'Alice',
        line: 'Where am I?',
        emotion: 'fear',
        gender: 'female',
        age: 'kid'
      }
    ]
  },
  {
    setting: 'Moonlit forest clearing',
    mood: 'urgent and panicked',
    characters: ['Alice', 'Rabbit'],
    dialogue: [
      {
        speaker: 'Narrator',
        line: 'Suddenly, a white rabbit appeared before her, his pocket watch gleaming in the moonlight.',
        emotion: 'neutral',
        gender: 'female',
        age: 'adult'
      },
      {
        speaker: 'Rabbit',
        line: "We're late! The Queen will have our heads!",
        emotion: 'panic',
        gender: 'male',
        age: 'adult'
      },
      {
        speaker: 'Alice',
        line: "But I don't understand. Late for what?",
        emotion: 'confusion',
        gender: 'female',
        age: 'kid'
      },
      {
        speaker: 'Rabbit',
        line: 'For the tea party, of course! Follow me, quickly!',
        emotion: 'urgency',
        gender: 'male',
        age: 'adult'
      }
    ]
  },
  {
    setting: 'Enchanted forest path',
    mood: 'adventurous',
    characters: ['Alice', 'Rabbit'],
    dialogue: [
      {
        speaker: 'Narrator',
        line: 'And so Alice followed the mysterious rabbit deeper into the enchanted forest, not knowing what adventures awaited her.',
        emotion: 'wonder',
        gender: 'female',
        age: 'adult'
      }
    ]
  }
];

/**
 * Builds the structured-extraction prompt for the NLP model.
 * Exported so it can be reused/tweaked (e.g. by the image service for
 * scene summarization, or by future endpoints) without duplicating it.
 */
const buildAnalysisPrompt = (text) => `Analyze the following story text and extract structured information. Return ONLY a JSON object with this exact structure:

{
  "scenes": [
    {
      "setting": "description of the location or the place like town, castle, or room",
      "mood": "overall emotional tone of the scene",
      "characters": ["list of characters present"],
      "dialogue": [
        {
          "speaker": "character name or Narrator",
          "line": "the spoken line or narration",
          "emotion": "emotion being expressed (only from 'fear','panic','anger','sad','happy','neutral','confusion','urgency','wonder')",
          "gender": "male or female",
          "age": "only from 'kid','adult','elderly'"
        }
      ]
    }
  ]
}

Story text to analyze:
"""${text}"""

Important:
- Break the story into logical scenes based on location changes or major shifts in action
- Identify each speaker correctly
- Detect emotions from context and dialogue tone
- Include narrator lines for descriptive passages
- Return ONLY valid JSON, no markdown formatting`;

const analyzeStory = async (text) => {
  try {
    if (USE_MOCK) {
      console.log('Using mock NLP service');
      await new Promise((resolve) => setTimeout(resolve, 1500));

      return {
        success: true,
        scenes: MOCK_SCENES,
        mock: true
      };
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = buildAnalysisPrompt(text);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : responseText;

    const parsedData = JSON.parse(jsonString);

    if (!parsedData.scenes || !Array.isArray(parsedData.scenes)) {
      throw new Error('Model response did not contain a valid scenes array');
    }

    return {
      success: true,
      scenes: parsedData.scenes,
      mock: false
    };
  } catch (error) {
    console.error('NLP Analysis Error:', error.message);
    return {
      success: false,
      scenes: [],
      error: error.message,
      mock: false
    };
  }
};

module.exports = {
  analyzeStory,
  buildAnalysisPrompt
};
