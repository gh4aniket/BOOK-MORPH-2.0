const express = require('express');
const cors = require('cors');
const path = require('path');

const bookRoutes = require('./routes/bookRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const analyzeRoutes = require('./routes/analyzeRoutes');
const visualRoutes = require('./routes/visualRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000'
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically so the frontend can render scene source
// pages (extracted images aren't required to render, but original uploads
// are reachable here, e.g. /uploads/images/page-123.png).
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'StoryApp API is running' });
});

// Primary resource: books (full pipeline, list/get/delete/status)
app.use('/api/books', bookRoutes);

// Standalone staged endpoints (not tied to a saved Book) — useful for
// previews, debugging, or building alternate frontend flows.
app.use('/api/upload', uploadRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/visuals', visualRoutes);
// NOTE: there is no /api/audio endpoint. Audio is generated entirely on
// the frontend using the browser's Web Speech API. The frontend derives
// pitch/rate/voice selection itself from each dialogue line's
// gender/age/emotion fields, which are already present in scene data
// returned by /api/analyze and /api/books/:id.

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
