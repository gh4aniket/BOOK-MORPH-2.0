# 📚 BOOK-MORPH 2.0

> **Transform books and story pages into interactive multimedia experiences.**

BOOK-MORPH 2.0 is a full-stack web application that converts uploaded **book pages, images, and PDF documents** into an interactive story experience.

The application combines **OCR, AI-powered scene analysis, visual processing, and browser-based narration** to transform static story content into an engaging multimedia format.

---

## ✨ Features

* 📄 **Upload Books & Story Pages**

  * Upload multiple images or PDF files.
  * Supports batch uploads of up to 30 files.

* 🔍 **OCR Text Extraction**

  * Extract text from uploaded book pages using Tesseract.js.
  * PDF pages can be processed as images for text extraction.

* 🤖 **AI-Powered Scene Analysis**

  * Analyze extracted story content.
  * Identify scenes, characters, dialogue, emotions, and other story information.
  * Uses Google's Generative AI capabilities.

* 🎨 **Scene Visualization**

  * Process story scenes and generate visual representations.
  * Store and display scene-related visual information.

* 🔊 **Browser-Based Narration**

  * Narrate story dialogue directly in the browser.
  * Uses the Web Speech API rather than requiring a separate audio-generation backend.

* 📖 **Interactive Story Viewer**

  * Read and experience processed stories through a dedicated story player.
  * Navigate through individual scenes and dialogue.

* 🗂️ **Book Management**

  * Create, view, list, and delete books.
  * Track processing status for uploaded books.

* 🌐 **REST API**

  * Express-based backend API for communicating with the frontend.

---

## 🏗️ Tech Stack

### Frontend

* React 18
* Vite
* React Router DOM
* JavaScript
* HTML/CSS

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* Multer
* Tesseract.js
* PDF2Pic
* Google Generative AI
* Axios
* CORS
* dotenv

### Architecture

```text
                    ┌──────────────────────┐
                    │     React Frontend   │
                    │      + Vite          │
                    └──────────┬───────────┘
                               │
                               │ REST API
                               ▼
                    ┌──────────────────────┐
                    │   Express / Node.js  │
                    │       Backend        │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
          ┌──────────┐   ┌───────────┐   ┌──────────────┐
          │ MongoDB  │   │ Tesseract │   │ Google       │
          │          │   │ OCR       │   │ Generative AI│
          └──────────┘   └───────────┘   └──────────────┘
                │
                ▼
          ┌──────────────┐
          │ Story / Book │
          │ Data         │
          └──────────────┘
```

---

## 📁 Project Structure

```text
BOOK-MORPH-2.0/
│
├── storyapp/                    # Backend
│   ├── config/                  # Database configuration
│   ├── controllers/             # Request/business logic
│   ├── middleware/              # Upload & error handling middleware
│   ├── models/                  # MongoDB/Mongoose models
│   ├── routes/                  # API routes
│   ├── services/                # Application services
│   ├── utils/                   # Utility functions
│   ├── uploads/                 # Uploaded files
│   ├── app.js                   # Express application
│   ├── server.js                # Server entry point
│   ├── package.json
│   └── package-lock.json
│
├── storyapp-frontend/           # React frontend
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── pages/               # Application pages
│   │   ├── services/            # API/service functions
│   │   ├── styles/              # Styling
│   │   ├── utils/               # Frontend utilities
│   │   ├── App.jsx              # Application routing
│   │   └── main.jsx             # React entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
└── README.md
```

---

## 🔄 How It Works

BOOK-MORPH follows a multi-stage processing pipeline:

```text
Upload
  │
  ▼
Images / PDF
  │
  ▼
Text Extraction
  │
  ▼
OCR Processing
  │
  ▼
Story / Scene Analysis
  │
  ▼
Scene Data
  │
  ├──────────────► Visual Processing
  │
  └──────────────► Dialogue / Emotion Data
                         │
                         ▼
                  Browser Narration
                         │
                         ▼
                 Interactive Story
```

### 1. Upload

Users upload images or PDF pages through the frontend.

The backend uses **Multer** to handle multipart file uploads.

### 2. OCR

Uploaded content is processed using **Tesseract.js** to extract text from story pages.

PDF documents can also be converted into images using `pdf2pic` before further processing.

### 3. AI Scene Analysis

The extracted story content is analyzed using Google's Generative AI library.

The application can derive structured scene information such as dialogue, characters, emotions, and other story attributes.

### 4. Scene Visualization

The processed scene information is sent through the visual-processing pipeline so that scenes can be presented as multimedia content.

### 5. Narration

Dialogue is narrated directly in the browser using the **Web Speech API**. No dedicated audio API endpoint is required by the backend.

---

# 🚀 Getting Started

## Prerequisites

Make sure you have the following installed:

* Node.js
* npm
* MongoDB
* Git

You will also need a Google Generative AI API key for the AI-powered processing functionality.

---

## 1. Clone the Repository

```bash
git clone https://github.com/gh4aniket/BOOK-MORPH-2.0.git

cd BOOK-MORPH-2.0
```

---

## 2. Setup the Backend

Navigate to the backend directory:

```bash
cd storyapp
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
GOOGLE_API_KEY=your_google_generative_ai_api_key
CLIENT_ORIGIN=http://localhost:5173
```

> Use the exact environment-variable names expected by your local configuration if they differ from the example above.

Start the backend in development mode:

```bash
npm run dev
```

Or start it normally:

```bash
npm start
```

The backend runs on port `5000` by default.

---

## 3. Setup the Frontend

Open another terminal:

```bash
cd storyapp-frontend
```

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Vite will provide the local frontend URL in the terminal.

---

# 🔌 API Overview

The backend exposes the following primary API areas:

| Endpoint          | Purpose                        |
| ----------------- | ------------------------------ |
| `GET /api/health` | Check API health               |
| `/api/books`      | Book management and processing |
| `/api/upload`     | Upload images/PDF files        |
| `/api/analyze`    | Analyze uploaded story content |
| `/api/visuals`    | Process scene visuals          |

The Express application registers these routes under their respective `/api` prefixes.

### Health Check

```http
GET /api/health
```

Example response:

```json
{
  "success": true,
  "message": "StoryApp API is running"
}
```

---

# 🖥️ Frontend Routes

The React application currently provides routes for:

| Route             | Page                     |
| ----------------- | ------------------------ |
| `/`               | Dashboard                |
| `/upload`         | Upload story/book        |
| `/books/:id`      | Book details             |
| `/books/:id/play` | Interactive story viewer |
| `*`               | Not Found                |

These routes are defined using React Router.

---

# 🧩 Backend Architecture

The backend follows a modular Express architecture:

```text
Request
   │
   ▼
Routes
   │
   ▼
Middleware
   │
   ▼
Controllers
   │
   ▼
Services
   │
   ▼
Models / External APIs
   │
   ▼
MongoDB / Generated Data
```

### Main Backend Components

**Routes**

Define API endpoints and map requests to controllers.

**Controllers**

Handle incoming requests and coordinate application logic.

**Services**

Contain reusable processing logic such as OCR, AI analysis, and visual processing.

**Models**

Define the MongoDB data structures using Mongoose.

**Middleware**

Handles uploads, errors, and other request-processing concerns.

The repository's backend is organized around these modules under `config`, `controllers`, `middleware`, `models`, `routes`, `services`, and `utils`.

---

# 🛡️ Environment Variables

Never commit API keys, database credentials, or other secrets to Git.

Recommended `.env` structure:

```env
PORT=5000
MONGO_URI=your_mongodb_uri
GOOGLE_API_KEY=your_google_api_key
CLIENT_ORIGIN=http://localhost:5173
```

Add `.env` to `.gitignore`.

For collaborators, provide a `.env.example` file containing placeholder values instead of real credentials.

---

# 🧪 Development

### Backend

```bash
cd storyapp
npm run dev
```

The backend uses **Nodemon** for automatic server restarts during development.

### Frontend

```bash
cd storyapp-frontend
npm run dev
```

### Production Frontend Build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

---

# 🔮 Future Improvements

Potential improvements for future versions include:

* 🔐 User authentication and authorization
* ☁️ Cloud-based file storage
* 📱 Improved mobile responsiveness
* 🎙️ More advanced AI voice narration
* 🎨 AI-generated scene illustrations
* ⚡ Background processing for large books
* 📊 Processing progress indicators
* 🧪 Automated unit and integration tests
* 🚀 Production deployment configuration
* 🐳 Docker support
* 🔄 Real-time processing updates

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch:

```bash
git checkout -b feature/your-feature
```

3. Make your changes.
4. Commit your changes:

```bash
git commit -m "Add your feature"
```

5. Push the branch:

```bash
git push origin feature/your-feature
```

6. Open a Pull Request.

---

# 📄 License

This project does not currently specify a license in the repository. If you plan to distribute or open-source the project, add an appropriate `LICENSE` file.

---

# 👨‍💻 Project

**BOOK-MORPH 2.0**

Repository:

https://github.com/gh4aniket/BOOK-MORPH-2.0

Built with ❤️ using React, Node.js, Express, MongoDB, OCR, and Generative AI.
