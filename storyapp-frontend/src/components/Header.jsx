import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import './Header.css';

const Header = () => {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="brand" aria-label="Storybound home">
          <span className="brand__mark" aria-hidden="true">✦</span>
          <span className="brand__word">Storybound</span>
        </Link>

        <nav className="site-nav" aria-label="Primary">
          <NavLink to="/" end className={({ isActive }) => `site-nav__link ${isActive ? 'is-active' : ''}`}>
            Shelf
          </NavLink>
          <NavLink
            to="/upload"
            className={({ isActive }) => `site-nav__link site-nav__link--cta ${isActive ? 'is-active' : ''}`}
          >
            New story
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Header;
