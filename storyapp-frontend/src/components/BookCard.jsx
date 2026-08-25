import React from 'react';
import { Link } from 'react-router-dom';
import './BookCard.css';

const STATUS_LABEL = {
  pending: 'Binding…',
  completed: 'Ready',
  failed: 'Failed'
};

// Cycle through a few leather/sage/gold spine tones so the shelf doesn't
// look monotonous — purely decorative, keyed by index so it's stable.
const SPINE_TONES = ['spine--gold', 'spine--leather', 'spine--sage'];

const BookCard = ({ book, index = 0 }) => {
  const status = book.simpleStatus || 'pending';
  const isClickable = status === 'completed';
  const tone = SPINE_TONES[index % SPINE_TONES.length];

  const sceneCount = book.scenes?.length ?? 0;
  const coverImage = book.scenes?.find((s) => s.imageUrl)?.imageUrl;

  const content = (
    <>
      <div className={`book-card__spine ${tone}`} aria-hidden="true" />
      <div className="book-card__cover">
        {coverImage ? (
          <img src={coverImage} alt="" />
        ) : (
          <div className="book-card__cover-placeholder">
            <span aria-hidden="true">{status === 'pending' ? '✦' : status === 'failed' ? '⚠' : '📖'}</span>
          </div>
        )}
      </div>
      <div className="book-card__body">
        <span className={`status-pill status-pill--${status}`}>{STATUS_LABEL[status]}</span>
        <h3 className="book-card__title">{book.title || 'Untitled Story'}</h3>
        <p className="book-card__meta mono">
          {status === 'completed'
            ? `${sceneCount} scene${sceneCount === 1 ? '' : 's'}`
            : status === 'failed'
              ? book.error || 'Something went wrong'
              : book.statusMessage || 'Processing…'}
        </p>
      </div>
    </>
  );

  if (!isClickable) {
    return <div className="book-card book-card--disabled">{content}</div>;
  }

  return (
    <Link to={`/books/${book._id}`} className="book-card">
      {content}
    </Link>
  );
};

export default BookCard;
