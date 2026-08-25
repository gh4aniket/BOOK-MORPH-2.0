import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BookCard from '../components/BookCard.jsx';
import { listBooks } from '../services/api.js';
import { useMultiBookStatusPolling } from '../hooks/useBookStatusPolling.js';
import './Dashboard.css';

const Dashboard = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadBooks = useCallback(async () => {
    try {
      const res = await listBooks({ limit: 50 });
      setBooks(res.books || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Could not load your shelf');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const pendingIds = useMemo(
    () => books.filter((b) => (b.simpleStatus || 'pending') === 'pending').map((b) => b._id),
    [books]
  );

  const handleStatusUpdate = useCallback(({ bookId, simpleStatus, statusMessage, error: bookError }) => {
    setBooks((prev) =>
      prev.map((b) =>
        b._id === bookId ? { ...b, simpleStatus, statusMessage, error: bookError } : b
      )
    );
  }, []);

  useMultiBookStatusPolling(pendingIds, handleStatusUpdate, { enabled: pendingIds.length > 0 });

  return (
    <div className="container dashboard">
      <div className="dashboard__header">
        <div>
          <span className="dashboard__eyebrow mono">YOUR SHELF</span>
          <h1 className="dashboard__title">Every story you've bound</h1>
        </div>
        <Link to="/upload" className="btn btn-primary">
          + New story
        </Link>
      </div>

      {loading && (
        <div className="dashboard__state">
          <div className="spinner" aria-hidden="true" />
          <p>Dusting off the shelf…</p>
        </div>
      )}

      {!loading && error && (
        <div className="dashboard__state dashboard__state--error">
          <p>Couldn't reach the shelf: {error}</p>
          <button className="btn btn-secondary" onClick={loadBooks}>Try again</button>
        </div>
      )}

      {!loading && !error && books.length === 0 && (
        <div className="dashboard__empty">
          <span className="dashboard__empty-mark" aria-hidden="true">✦</span>
          <h2>The shelf is bare</h2>
          <p>Upload a few pages — photos, scans, or a PDF — and Storybound will turn them into a narrated scene-by-scene story.</p>
          <Link to="/upload" className="btn btn-primary">Add your first story</Link>
        </div>
      )}

      {!loading && !error && books.length > 0 && (
        <div className="dashboard__grid">
          {books.map((book, idx) => (
            <BookCard key={book._id} book={book} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
