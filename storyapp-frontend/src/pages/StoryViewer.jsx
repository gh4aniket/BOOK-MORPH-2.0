import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getBook } from '../services/api.js';
import {
  cancelSpeech,
  ensureVoicesLoaded,
  isSpeechSupported,
  pauseSpeech,
  resumeSpeech,
  speakLine
} from '../utils/narration.js';
import './StoryViewer.css';

const StoryViewer = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [sceneIndex, setSceneIndex] = useState(() => Number(searchParams.get('scene')) || 0);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechUnsupported, setSpeechUnsupported] = useState(false);

  // playRequestId guards against stale async speech callbacks acting after
  // the user has paused, jumped scenes, or unmounted.
  const playRequestId = useRef(0);
  const isPausedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getBook(id);
        if (cancelled) return;
        setBook(res.book);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load this book');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!isSpeechSupported()) {
      setSpeechUnsupported(true);
      return;
    }
    ensureVoicesLoaded();
  }, []);

  // Stop any in-flight narration on unmount.
  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, []);

  const scenes = book?.scenes || [];
  const currentScene = scenes[sceneIndex];
  const currentDialogue = currentScene?.dialogue?.[dialogueIndex];

  const hasNext =
    sceneIndex < scenes.length - 1 || dialogueIndex < (currentScene?.dialogue?.length || 1) - 1;
  const hasPrevious = sceneIndex > 0 || dialogueIndex > 0;

  /**
   * Speaks the line at (sIdx, dIdx), then — if still playing and not
   * superseded by a newer play request — advances to the next line,
   * auto-advancing across scene boundaries (continuous playback).
   */
  const playFrom = useCallback(
    (sIdx, dIdx, requestId) => {
      const scene = scenes[sIdx];
      const line = scene?.dialogue?.[dIdx];
      if (!line) {
        setIsPlaying(false);
        return;
      }

      setSceneIndex(sIdx);
      setDialogueIndex(dIdx);

      if (speechUnsupported) {
        // No narration available — still let the user step through
        // manually, but don't auto-advance without audio to pace it.
        setIsPlaying(false);
        return;
      }

      speakLine(line).then((result) => {
        // Stale callback from a superseded play session — ignore.
        if (requestId !== playRequestId.current) return;
        // User paused mid-line — don't auto-advance.
        if (isPausedRef.current) return;
        if (result.cancelled) return;

        const nextDIdx = dIdx + 1;
        const sceneHasMore = scene.dialogue && nextDIdx < scene.dialogue.length;

        if (sceneHasMore) {
          playFrom(sIdx, nextDIdx, requestId);
        } else if (sIdx + 1 < scenes.length) {
          playFrom(sIdx + 1, 0, requestId);
        } else {
          setIsPlaying(false);
        }
      });
    },
    [scenes, speechUnsupported]
  );

  const handlePlay = () => {
    if (!currentDialogue) return;
    isPausedRef.current = false;
    setIsPlaying(true);
    playRequestId.current += 1;
    playFrom(sceneIndex, dialogueIndex, playRequestId.current);
  };

  const handlePause = () => {
    isPausedRef.current = true;
    setIsPlaying(false);
    pauseSpeech();
  };

  const handleResume = () => {
    // If the browser's speechSynthesis still has the utterance queued
    // (simple pause/resume), resume it in place rather than restarting
    // the line from the beginning.
    isPausedRef.current = false;
    setIsPlaying(true);
    resumeSpeech();

    // Safety net: some browsers drop paused utterances after a while or
    // never properly resume. If nothing is actually speaking shortly
    // after resume, restart playback from the current line.
    setTimeout(() => {
      if (!window.speechSynthesis?.speaking && !window.speechSynthesis?.pending) {
        playRequestId.current += 1;
        playFrom(sceneIndex, dialogueIndex, playRequestId.current);
      }
    }, 250);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      handlePause();
    } else if (window.speechSynthesis?.paused) {
      handleResume();
    } else {
      handlePlay();
    }
  };

  const jumpToLine = (sIdx, dIdx) => {
    cancelSpeech();
    isPausedRef.current = false;
    setSceneIndex(sIdx);
    setDialogueIndex(dIdx);
    if (isPlaying) {
      playRequestId.current += 1;
      playFrom(sIdx, dIdx, playRequestId.current);
    }
  };

  const handleNextLine = () => {
    if (dialogueIndex < (currentScene?.dialogue?.length || 0) - 1) {
      jumpToLine(sceneIndex, dialogueIndex + 1);
    } else if (sceneIndex < scenes.length - 1) {
      jumpToLine(sceneIndex + 1, 0);
    }
  };

  const handlePreviousLine = () => {
    if (dialogueIndex > 0) {
      jumpToLine(sceneIndex, dialogueIndex - 1);
    } else if (sceneIndex > 0) {
      const prevScene = scenes[sceneIndex - 1];
      jumpToLine(sceneIndex - 1, (prevScene.dialogue?.length || 1) - 1);
    }
  };

  const handleNextScene = () => {
    if (sceneIndex < scenes.length - 1) {
      jumpToLine(sceneIndex + 1, 0);
    }
  };

  const handlePreviousScene = () => {
    if (sceneIndex > 0) {
      jumpToLine(sceneIndex - 1, 0);
    }
  };

  if (loading) {
    return (
      <div className="container viewer-state">
        <div className="spinner" aria-hidden="true" />
        <p>Raising the curtain…</p>
      </div>
    );
  }

  if (loadError || !book) {
    return (
      <div className="container viewer-state viewer-state--error">
        <p>{loadError || 'Book not found.'}</p>
        <Link to="/" className="btn btn-secondary">Back to shelf</Link>
      </div>
    );
  }

  if (scenes.length === 0) {
    return (
      <div className="container viewer-state">
        <p>This story has no scenes yet.</p>
        <Link to={`/books/${id}`} className="btn btn-secondary">Back to book</Link>
      </div>
    );
  }

  const totalLinesInScene = currentScene?.dialogue?.length || 1;
  const playerProgressPct =
    scenes.length > 0
      ? ((sceneIndex + (dialogueIndex + 1) / totalLinesInScene) / scenes.length) * 100
      : 0;

  return (
    <div className={`storybook ${isPlaying ? 'storybook--playing' : ''}`}>
      <div className="storybook__topbar container">
        <Link to={`/books/${id}`} className="storybook__title-link">
          <span className="storybook__title">{book.title}</span>
          <span className="storybook__chevron" aria-hidden="true">⌄</span>
        </Link>
        {book.author && <span className="storybook__author">{book.author}</span>}
        <span className="storybook__progress mono">
          Scene {sceneIndex + 1} / {scenes.length}
        </span>
      </div>

      <div className="storybook__stage container">
        <div className="book-frame">
        <div className="book">
          <div className="book__page book__page--left">
            <div className="book__image-frame">
              {currentScene.imageUrl ? (
                <img src={currentScene.imageUrl} alt={currentScene.setting || ''} />
              ) : (
                <div className="book__image-placeholder" aria-hidden="true">🎨</div>
              )}
            </div>
            <div className="book__page-nav">
              <button
                className="book__page-arrow"
                onClick={handlePreviousLine}
                disabled={!hasPrevious}
                aria-label="Previous line"
              >
                ‹
              </button>
              <span className="book__page-count mono">
                {dialogueIndex + 1} / {totalLinesInScene}
              </span>
              <button
                className="book__page-arrow"
                onClick={handleNextLine}
                disabled={!hasNext}
                aria-label="Next line"
              >
                ›
              </button>
            </div>
          </div>

          <div className="book__spine" aria-hidden="true" />

          <div className="book__page book__page--right">
            <div className="book__page-header">
              <span className="book__chapter-label mono">Scene {sceneIndex + 1}</span>
              <h2 className="book__scene-title">{currentScene.setting}</h2>
              {currentScene.mood && <span className="book__mood-tag">{currentScene.mood}</span>}
            </div>

            <div className="book__dialogue">
              {currentDialogue ? (
                <>
                  <span className="book__speaker mono">
                    {currentDialogue.speaker || 'Narrator'}
                  </span>
                  <p className="book__line">{currentDialogue.line}</p>
                </>
              ) : (
                <p className="book__line book__line--muted">No dialogue in this scene.</p>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      {speechUnsupported && (
        <p className="storybook__warning container">
          Your browser doesn't support spoken narration. You can still read through the story manually.
        </p>
      )}

      <div className="scene-strip container">
        <span className="scene-strip__label">Scenes</span>
        <div className="scene-strip__list">
          {scenes.map((scene, idx) => (
            <button
              key={idx}
              className={`scene-card ${idx === sceneIndex ? 'is-active' : ''} ${
                idx < sceneIndex ? 'is-past' : ''
              }`}
              onClick={() => jumpToLine(idx, 0)}
              aria-label={`Jump to scene ${idx + 1}`}
              title={`Scene ${idx + 1}: ${scene.setting || ''}`}
            >
              <span className="scene-card__image">
                {scene.imageUrl ? (
                  <img src={scene.imageUrl} alt="" />
                ) : (
                  <span className="scene-card__placeholder" aria-hidden="true">🎨</span>
                )}
              </span>
              <span className="scene-card__meta">
                <span className="scene-card__number mono">Scene {idx + 1}</span>
                <span className="scene-card__setting">{scene.setting}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="player-bar">
        <div className="player-bar__inner container">
          <div className="player-bar__cover">
            {currentScene.imageUrl ? (
              <img src={currentScene.imageUrl} alt="" />
            ) : (
              <span aria-hidden="true">🎨</span>
            )}
          </div>

          <div className="player-bar__meta">
            <span className="player-bar__title">{currentScene.setting}</span>
            <span className="player-bar__subtitle">{book.title}</span>
          </div>

          <div className="player-bar__controls">
            <button
              className="player-bar__btn"
              onClick={handlePreviousScene}
              disabled={sceneIndex === 0}
              aria-label="Previous scene"
            >
              ⏮
            </button>
            <button
              className="player-bar__btn"
              onClick={handlePreviousLine}
              disabled={!hasPrevious}
              aria-label="Previous line"
            >
              ‹
            </button>
            <button
              className="player-bar__btn player-bar__btn--play"
              onClick={togglePlayPause}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : window.speechSynthesis?.paused ? '▶' : '▶'}
            </button>
            <button
              className="player-bar__btn"
              onClick={handleNextLine}
              disabled={!hasNext}
              aria-label="Next line"
            >
              ›
            </button>
            <button
              className="player-bar__btn"
              onClick={handleNextScene}
              disabled={sceneIndex === scenes.length - 1}
              aria-label="Next scene"
            >
              ⏭
            </button>
          </div>

          <div className="player-bar__progress">
            <span className="player-bar__time mono">Scene {sceneIndex + 1}</span>
            <div className="player-bar__progress-track">
              <div
                className="player-bar__progress-fill"
                style={{ width: `${playerProgressPct}%` }}
              />
            </div>
            <span className="player-bar__time mono">{scenes.length} total</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryViewer;