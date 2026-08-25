/**
 * All narration happens client-side via the Web Speech API. The backend
 * sends each dialogue line with `speaker`, `line`, `emotion`, `gender`,
 * `age` — this module turns those into SpeechSynthesisUtterance settings.
 */

const AGE_BASE_PITCH = {
  kid: 1.35,
  adult: 1.0,
  elderly: 0.85
};

const AGE_BASE_RATE = {
  kid: 1.05,
  adult: 1.0,
  elderly: 0.9
};

const EMOTION_MODIFIERS = {
  fear: { pitchMul: 1.1, rateMul: 1.15 },
  panic: { pitchMul: 1.15, rateMul: 1.25 },
  anger: { pitchMul: 1.05, rateMul: 1.15 },
  sad: { pitchMul: 0.9, rateMul: 0.85 },
  happy: { pitchMul: 1.1, rateMul: 1.05 },
  neutral: { pitchMul: 1.0, rateMul: 1.0 },
  confusion: { pitchMul: 1.0, rateMul: 1.05 },
  urgency: { pitchMul: 1.05, rateMul: 1.2 },
  wonder: { pitchMul: 1.05, rateMul: 0.95 },
  default: { pitchMul: 1.0, rateMul: 1.0 }
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Returns { pitch, rate } for a dialogue line, derived from age + emotion.
 */
export const getSpeechParams = ({ age = 'adult', emotion = 'neutral' } = {}) => {
  const basePitch = AGE_BASE_PITCH[age] ?? AGE_BASE_PITCH.adult;
  const baseRate = AGE_BASE_RATE[age] ?? AGE_BASE_RATE.adult;
  const modifier = EMOTION_MODIFIERS[emotion] || EMOTION_MODIFIERS.default;

  return {
    pitch: Number(clamp(basePitch * modifier.pitchMul, 0.5, 2).toFixed(2)),
    rate: Number(clamp(baseRate * modifier.rateMul, 0.5, 2).toFixed(2))
  };
};

// Heuristic name fragments commonly found in browser/OS voice names.
// Browsers don't expose a real gender attribute on SpeechSynthesisVoice,
// so this is a best-effort match against common voice naming conventions
// (e.g. "Google US English Female", "Microsoft David", "Samantha").
const FEMALE_NAME_HINTS = ['female', 'woman', 'samantha', 'victoria', 'karen', 'zira', 'susan', 'fiona', 'moira', 'tessa', 'allison', 'ava', 'serena', 'kate'];
const MALE_NAME_HINTS = ['male', 'man', 'david', 'daniel', 'alex', 'fred', 'george', 'james', 'mark', 'tom', 'aaron', 'arthur', 'oliver'];

let cachedVoices = [];
let voicesReadyPromise = null;

/**
 * Resolves once window.speechSynthesis has voices loaded. Some browsers
 * populate voices asynchronously after the `voiceschanged` event.
 */
export const ensureVoicesLoaded = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return Promise.resolve([]);
  }

  if (voicesReadyPromise) return voicesReadyPromise;

  voicesReadyPromise = new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      cachedVoices = existing;
      resolve(existing);
      return;
    }

    const onVoicesChanged = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        cachedVoices = voices;
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        resolve(voices);
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);

    // Fallback timeout in case voiceschanged never fires (some browsers)
    setTimeout(() => {
      const voices = window.speechSynthesis.getVoices();
      cachedVoices = voices;
      resolve(voices);
    }, 1000);
  });

  return voicesReadyPromise;
};

/**
 * Picks the best-available voice for a given gender + language preference.
 * Falls back gracefully: matching gender hint -> any English voice -> first
 * available voice -> undefined (browser default).
 */
export const pickVoice = (gender = 'female') => {
  const voices = cachedVoices.length > 0 ? cachedVoices : (window.speechSynthesis?.getVoices() || []);
  if (voices.length === 0) return undefined;

  const hints = gender === 'male' ? MALE_NAME_HINTS : FEMALE_NAME_HINTS;
  const englishVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
  const pool = englishVoices.length > 0 ? englishVoices : voices;

  const hinted = pool.find((v) => hints.some((hint) => v.name.toLowerCase().includes(hint)));
  if (hinted) return hinted;

  // No name-based match — alternate by index parity so male/female at
  // least sound distinct from each other rather than identical.
  return gender === 'male' ? pool[0] : pool[Math.min(1, pool.length - 1)];
};

/**
 * Speaks a single dialogue line. Returns a controller object with
 * `cancel()`. Resolves the returned promise when speech ends (naturally
 * or via cancel).
 */
export const speakLine = (dialogueLine) => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve({ cancelled: false, unsupported: true });
      return;
    }

    const { line, gender, age, emotion } = dialogueLine;
    const utterance = new SpeechSynthesisUtterance(line);
    const { pitch, rate } = getSpeechParams({ age, emotion });

    utterance.pitch = pitch;
    utterance.rate = rate;
    const voice = pickVoice(gender);
    if (voice) utterance.voice = voice;

    let settled = false;
    utterance.onend = () => {
      if (settled) return;
      settled = true;
      resolve({ cancelled: false });
    };
    utterance.onerror = () => {
      if (settled) return;
      settled = true;
      resolve({ cancelled: false, error: true });
    };

    window.speechSynthesis.speak(utterance);
  });
};

export const cancelSpeech = () => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

export const pauseSpeech = () => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.pause();
  }
};

export const resumeSpeech = () => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.resume();
  }
};

export const isSpeechSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;
