import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Upload from './pages/Upload.jsx';
import BookDetail from './pages/BookDetail.jsx';
import StoryViewer from './pages/StoryViewer.jsx';
import NotFound from './pages/NotFound.jsx';

const App = () => {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/books/:id" element={<BookDetail />} />
            <Route path="/books/:id/play" element={<StoryViewer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
