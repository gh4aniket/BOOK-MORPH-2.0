const axios = require('axios');

const USE_MOCK = !process.env.SERPAPI_KEY || process.env.SERPAPI_KEY === 'your_serpapi_key_here';

const MOCK_IMAGE_URLS = [
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
  'https://images.unsplash.com/photo-1511497584788-876760111969?w=800&q=80',
  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80'
];

// Optional local LLM (Ollama) used only to turn a scene into a short search
// query. If it's not reachable, we fall back to a simple heuristic query
// built directly from the scene fields — no hard dependency on Ollama.
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';

const buildSearchPromptForOllama = (scene) => `
You are an AI that converts fictional story scenes into short image search queries.

Task:
Summarize the following scene into ONLY 2 to 3 descriptive words suitable for searching real-world images.

Rules:
- Output ONLY 2-3 words.
- No full sentences.
- No explanations.
- No punctuation.
- Use generic real-world visual terms.
- If the scene contains fictional places, convert them into realistic equivalents.
- If a specific street (like "Privet Drive") is mentioned, convert it into something like "suburban houses" or "quiet neighborhood".
- If characters are mentioned, describe their visual type (e.g., young wizard -> boy wizard, old king -> medieval king).
- Focus on setting and atmosphere, not plot.
- Optimize for stock photo search.

Examples:

Scene: A quiet evening at Privet Drive with street lamps glowing.
Output: suburban street night

Scene: A dark forest where a young girl feels afraid.
Output: forest with girl

Scene: A wizard wearing black gown.
Output: a wizard

Now summarize this scene:

Setting: ${scene.setting}
Characters: ${(scene.characters || []).join(', ')}

Return only the 2-3 word search query.
`;

const heuristicQuery = (scene) => {
  const settingWords = (scene.setting || '').split(/\s+/).slice(0, 4).join(' ');
  return settingWords || scene.mood || 'storybook scene';
};

const buildSearchQuery = async (scene) => {
  try {
    const ollamaResponse = await axios.post(
      OLLAMA_URL,
      {
        model: 'mistral',
        prompt: buildSearchPromptForOllama(scene),
        stream: false
      },
      { timeout: 5000 }
    );

    const text = ollamaResponse.data?.response?.trim();
    if (text) {
      const characters = (scene.characters || []).join('+');
      return characters ? `${characters}+${text}` : text;
    }
  } catch (error) {
    // Ollama not running / unreachable — fine, fall back below.
    console.log('Ollama unavailable for query refinement, using heuristic query');
  }

  return heuristicQuery(scene);
};

const generateSceneImage = async (scene, index) => {
  try {
    if (USE_MOCK) {
      console.log(`Using mock image generation for scene ${index}`);
      await new Promise((resolve) => setTimeout(resolve, 800));

      return {
        success: true,
        imageUrl: MOCK_IMAGE_URLS[index % MOCK_IMAGE_URLS.length],
        mock: true
      };
    }

    const query = await buildSearchQuery(scene);

    const response = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: 'google_images',
        q: query,
        api_key: process.env.SERPAPI_KEY
      },
      timeout: 10000
    });

    const results = response.data?.images_results;
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('No images found for query');
    }

    const imageUrl = results[Math.min(2, results.length - 1)]?.original || results[0].original;

    if (!imageUrl) {
      throw new Error('Image result missing a usable URL');
    }

    return {
      success: true,
      imageUrl,
      mock: false
    };
  } catch (error) {
    console.error('Image Generation Error:', error.message);
    return {
      success: false,
      imageUrl: MOCK_IMAGE_URLS[index % MOCK_IMAGE_URLS.length],
      mock: true,
      error: error.message
    };
  }
};

const generateImagesForScenes = async (scenes) => {
  const results = [];

  for (let i = 0; i < scenes.length; i++) {
    const result = await generateSceneImage(scenes[i], i);
    results.push({
      sceneIndex: i,
      ...result
    });
  }

  return results;
};

module.exports = {
  generateSceneImage,
  generateImagesForScenes
};
