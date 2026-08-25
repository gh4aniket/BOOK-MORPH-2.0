import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SceneCard from '../components/SceneCard.jsx';
import { deleteBook, getBook } from '../services/api.js';
import './BookDetail.css';

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getBook(id);
        if (!cancelled) setBook(res.book);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load this book');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePlay = (sceneIndex) => {
    navigate(`/books/${id}/play?scene=${sceneIndex}`);
  };

  const handleDelete = async () => {
    if (!window.confirm('Remove this story from your shelf? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteBook(id);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Could not delete this book');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container book-detail__state">
        <div className="spinner" aria-hidden="true" />
        <p>Opening the book…</p>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="container book-detail__state book-detail__state--error">
        <p>{error || 'Book not found.'}</p>
        <Link to="/" className="btn btn-secondary">Back to shelf</Link>
      </div>
    );
  }

  const allCharacters = [...new Set((book.scenes || []).flatMap((s) => s.characters || []))];
  const totalLines = (book.scenes || []).reduce((sum, s) => sum + (s.dialogue?.length || 0), 0);

  return (
    <div className="container book-detail">
      <Link to="/" className="book-detail__back">← Back to shelf</Link>

      <div className="book-detail__header">
        <div>
          <span className="status-pill status-pill--completed">Ready</span>
          <h1 className="book-detail__title">{book.title}</h1>
          <div className="book-detail__stats mono">
            <span>{book.scenes?.length || 0} scenes</span>
            <span aria-hidden="true">·</span>
            <span>{totalLines} lines</span>
            <span aria-hidden="true">·</span>
            <span>{allCharacters.length} character{allCharacters.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        <div className="book-detail__header-actions">
          <button className="btn btn-primary" onClick={() => handlePlay(0)}>
            ▶ Play from the start
          </button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>

      {allCharacters.length > 0 && (
        <div className="book-detail__cast">
          <span className="book-detail__cast-label mono">CAST</span>
          <div className="book-detail__cast-tags">
            {allCharacters.map((char) => (
              <span key={char} className="cast-tag">{char}</span>
            ))}
          </div>
        </div>
      )}

      <div className="book-detail__scenes-header">
        <h2>Scenes</h2>
      
      </div>

      <div className="book-detail__grid">
        {(book.scenes || []).map((scene, idx) => (
          <SceneCard key={idx} scene={scene} index={idx} onPlay={handlePlay} />
        ))}
      </div>
    </div>
  );
};

export default BookDetail;
