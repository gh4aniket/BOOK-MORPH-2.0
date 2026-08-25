import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBookFromFiles, createBookFromText } from '../services/api.js';
import './Upload.css';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
const MAX_FILES = 30;

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Upload = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('files'); // 'files' | 'text'
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const addFiles = useCallback((incoming) => {
    const valid = [];
    const rejected = [];

    Array.from(incoming).forEach((file) => {
      if (ACCEPTED_TYPES.includes(file.type)) {
        valid.push(file);
      } else {
        rejected.push(file.name);
      }
    });

    setFiles((prev) => {
      const combined = [...prev, ...valid].slice(0, MAX_FILES);
      return combined;
    });

    if (rejected.length > 0) {
      setError(`Skipped ${rejected.length} unsupported file${rejected.length === 1 ? '' : 's'} (only JPEG, PNG, WebP, and PDF are allowed).`);
    } else {
      setError(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveFile = (index, direction) => {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (mode === 'files' && files.length === 0) {
      setError('Add at least one image or PDF page to continue.');
      return;
    }
    if (mode === 'text' && !text.trim()) {
      setError('Paste or type some story text to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const res =
        mode === 'files'
          ? await createBookFromFiles(files, title.trim() || undefined)
          : await createBookFromText(text.trim(), title.trim() || undefined);

      navigate('/', { state: { justCreatedId: res.book._id } });
    } catch (err) {
      setError(err.message || 'Something went wrong while uploading. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="container upload-page">
      <span className="upload-page__eyebrow mono">NEW STORY</span>
      <h1 className="upload-page__title">Bring a story to the stage</h1>
      <p className="upload-page__subtitle">
        Upload photographed or scanned pages, a PDF, or paste text directly. Storybound will read it, split it into
        scenes, and illustrate each one — ready to narrate aloud.
      </p>

      <div className="upload-mode-toggle" role="tablist" aria-label="Upload method">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'files'}
          className={`upload-mode-toggle__btn ${mode === 'files' ? 'is-active' : ''}`}
          onClick={() => setMode('files')}
        >
          Images / PDF
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'text'}
          className={`upload-mode-toggle__btn ${mode === 'text' ? 'is-active' : ''}`}
          onClick={() => setMode('text')}
        >
          Paste text
        </button>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="upload-field">
          <span className="upload-field__label">Title <span className="upload-field__optional">(optional)</span></span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Alice and the Hurried Rabbit"
            maxLength={120}
          />
        </label>

        {mode === 'files' ? (
          <>
            <div
              className={`dropzone ${isDragging ? 'is-dragging' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
              }}
            >
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPTED_TYPES.join(',')}
                className="visually-hidden"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <span className="dropzone__icon" aria-hidden="true">📜</span>
              <p className="dropzone__title">Drop pages here, or click to browse</p>
              <p className="dropzone__hint mono">JPEG · PNG · WebP · PDF — up to {MAX_FILES} pages</p>
            </div>

            {files.length > 0 && (
              <ul className="file-list">
                {files.map((file, idx) => (
                  <li key={`${file.name}-${idx}`} className="file-list__item">
                    <span className="file-list__order mono">{String(idx + 1).padStart(2, '0')}</span>
                    <span className="file-list__icon" aria-hidden="true">
                      {file.type === 'application/pdf' ? '📄' : '🖼️'}
                    </span>
                    <span className="file-list__name">{file.name}</span>
                    <span className="file-list__size mono">{formatBytes(file.size)}</span>
                    <span className="file-list__actions">
                      <button type="button" className="btn-ghost" onClick={() => moveFile(idx, -1)} disabled={idx === 0} aria-label="Move up">↑</button>
                      <button type="button" className="btn-ghost" onClick={() => moveFile(idx, 1)} disabled={idx === files.length - 1} aria-label="Move down">↓</button>
                      <button type="button" className="btn-ghost" onClick={() => removeFile(idx)} aria-label={`Remove ${file.name}`}>✕</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <label className="upload-field">
            <span className="upload-field__label">Story text</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Once upon a time, in a dark forest filled with mist and shadows..."
              rows={12}
            />
          </label>
        )}

        {error && <p className="upload-error" role="alert">{error}</p>}

        <div className="upload-form__actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Sending to the stage…' : 'Create story'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Upload;
