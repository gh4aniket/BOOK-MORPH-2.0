const API_BASE = '/api';

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

const handleResponse = async (res) => {
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok || (body && body.success === false)) {
    const message = body?.message || body?.error || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, body);
  }

  return body;
};

/**
 * Create a new book by uploading one or more image/PDF files.
 * @param {File[]} files
 * @param {string} [title]
 */
export const createBookFromFiles = async (files, title) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  if (title) formData.append('title', title);

  const res = await fetch(`${API_BASE}/books`, {
    method: 'POST',
    body: formData
  });

  return handleResponse(res);
};

/**
 * Create a new book directly from pasted/typed text (skips OCR).
 */
export const createBookFromText = async (text, title) => {
  const res = await fetch(`${API_BASE}/books/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, title })
  });

  return handleResponse(res);
};

export const listBooks = async ({ page = 1, limit = 50 } = {}) => {
  const res = await fetch(`${API_BASE}/books?page=${page}&limit=${limit}`);
  return handleResponse(res);
};

export const getBook = async (id) => {
  const res = await fetch(`${API_BASE}/books/${id}`);
  return handleResponse(res);
};

export const getBookStatus = async (id) => {
  const res = await fetch(`${API_BASE}/books/${id}/status`);
  return handleResponse(res);
};

export const deleteBook = async (id) => {
  const res = await fetch(`${API_BASE}/books/${id}`, { method: 'DELETE' });
  return handleResponse(res);
};

export const reanalyzeBook = async (id, rawText) => {
  const res = await fetch(`${API_BASE}/books/${id}/reanalyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rawText ? { rawText } : {})
  });
  return handleResponse(res);
};

export const regenerateVisuals = async (id) => {
  const res = await fetch(`${API_BASE}/books/${id}/regenerate-visuals`, {
    method: 'POST'
  });
  return handleResponse(res);
};
