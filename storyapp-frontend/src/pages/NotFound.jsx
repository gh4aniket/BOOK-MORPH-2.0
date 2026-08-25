import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="container not-found">
      <span className="not-found__mark" aria-hidden="true">✦</span>
      <h1>This page fell out of the book</h1>
      <p>There's nothing on this shelf at that address.</p>
      <Link to="/" className="btn btn-primary">Back to the shelf</Link>
    </div>
  );
};

export default NotFound;
