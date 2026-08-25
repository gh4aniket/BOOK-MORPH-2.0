import { useEffect, useRef, useState } from 'react';
import { getBookStatus } from '../services/api.js';

const POLL_INTERVAL_MS = 4000;

/**
 * Polls GET /api/books/:id/status every few seconds while the book's
 * simpleStatus is 'pending'. Stops automatically once it becomes
 * 'completed' or 'failed'. Returns the latest known status fields plus a
 * `version` counter callers can use as a dependency to refetch full data.
 */
export const useBookStatusPolling = (bookId, { enabled = true } = {}) => {
  const [simpleStatus, setSimpleStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);
  const timeoutRef = useRef(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!bookId || !enabled) return;

    cancelledRef.current = false;

    const poll = async () => {
      try {
        const res = await getBookStatus(bookId);
        if (cancelledRef.current) return;

        setSimpleStatus(res.simpleStatus);
        setStatusMessage(res.statusMessage || '');
        setError(res.error || null);
        setVersion((v) => v + 1);

        if (res.simpleStatus === 'pending') {
          timeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (cancelledRef.current) return;
        setError(err.message || 'Failed to check status');
      }
    };

    poll();

    return () => {
      cancelledRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [bookId, enabled]);

  return { simpleStatus, statusMessage, error, version };
};

/**
 * Polls status for a whole list of books at once (used on the Dashboard).
 * Only books currently in 'pending' are actively polled; the callback
 * receives { bookId, simpleStatus, statusMessage, error } on each update.
 */
export const useMultiBookStatusPolling = (bookIds, onUpdate, { enabled = true } = {}) => {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled || !bookIds || bookIds.length === 0) return;

    let cancelled = false;
    const timeouts = new Map();

    const pollOne = async (id) => {
      try {
        const res = await getBookStatus(id);
        if (cancelled) return;

        onUpdateRef.current?.({
          bookId: id,
          simpleStatus: res.simpleStatus,
          statusMessage: res.statusMessage,
          error: res.error,
          book: res.book
        });

        if (res.simpleStatus === 'pending') {
          const t = setTimeout(() => pollOne(id), POLL_INTERVAL_MS);
          timeouts.set(id, t);
        }
      } catch {
        // Silently retry on the next overall poll cycle rather than
        // surfacing per-book network blips on the dashboard.
        if (!cancelled) {
          const t = setTimeout(() => pollOne(id), POLL_INTERVAL_MS);
          timeouts.set(id, t);
        }
      }
    };

    bookIds.forEach((id) => pollOne(id));

    return () => {
      cancelled = true;
      timeouts.forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(bookIds), enabled]);
};
