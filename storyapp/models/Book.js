const mongoose = require('mongoose');

/**
 * One line of dialogue/narration inside a scene.
 * gender/age are kept (even though TTS is now done in-browser) because the
 * frontend uses them to pick an appropriate Web Speech voice and pitch/rate.
 */
const dialogueSchema = new mongoose.Schema(
  {
    speaker: { type: String, default: 'Narrator' },
    line: { type: String, required: true },
    emotion: {
      type: String,
      enum: [
        'fear', 'panic', 'anger', 'sad', 'happy',
        'neutral', 'confusion', 'urgency', 'wonder'
      ],
      default: 'neutral'
    },
    gender: { type: String, enum: ['male', 'female'], default: 'female' },
    age: { type: String, enum: ['kid', 'adult', 'elderly'], default: 'adult' }
  },
  { _id: false }
);

const sceneSchema = new mongoose.Schema(
  {
    setting: { type: String, default: '' },
    mood: { type: String, default: '' },
    characters: { type: [String], default: [] },
    dialogue: { type: [dialogueSchema], default: [] },
    imageUrl: { type: String, default: null },
    imageMock: { type: Boolean, default: false }
  },
  { _id: false }
);

/**
 * A single uploaded source file (image page or a page rasterized from a PDF).
 */
const sourceFileSchema = new mongoose.Schema(
  {
    originalName: { type: String },
    storedPath: { type: String }, // relative path under /uploads
    mimeType: { type: String },
    pageNumber: { type: Number, default: 1 }, // order within the book
    extractedText: { type: String, default: '' },
    error: { type: String, default: null } // per-page OCR failure, if any
  },
  { _id: false }
);

const PROCESSING_STAGES = [
  'uploaded',
  'extracting_text',
  'analyzing_story',
  'generating_visuals',
  'ready',
  'failed'
];

const bookSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      default: 'Untitled Story'
    },
    sourceFiles: { type: [sourceFileSchema], default: [] },
    sourceType: {
      type: String,
      enum: ['image', 'pdf', 'mixed', 'text'],
      default: 'image'
    },
    rawText: {
      type: String,
      default: ''
    },
    scenes: { type: [sceneSchema], default: [] },

    status: {
      type: String,
      enum: PROCESSING_STAGES,
      default: 'uploaded'
    },
    statusMessage: { type: String, default: '' },
    error: { type: String, default: null },

    // Flags so the UI can show "mock data" badges, same spirit as the
    // original controllers' `mock` flags.
    mock: {
      ocr: { type: Boolean, default: false },
      nlp: { type: Boolean, default: false },
      images: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

bookSchema.index({ userId: 1, createdAt: -1 });

bookSchema.statics.PROCESSING_STAGES = PROCESSING_STAGES;

/**
 * Collapses the detailed internal stage into the 3 states the frontend
 * actually needs to decide whether a book is clickable:
 *   - 'pending'   any in-progress stage (uploaded/extracting/analyzing/generating_visuals)
 *   - 'completed' status === 'ready'
 *   - 'failed'    status === 'failed'
 */
bookSchema.virtual('simpleStatus').get(function () {
  if (this.status === 'ready') return 'completed';
  if (this.status === 'failed') return 'failed';
  return 'pending';
});

bookSchema.set('toJSON', { virtuals: true });
bookSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.Book || mongoose.model('Book', bookSchema);
