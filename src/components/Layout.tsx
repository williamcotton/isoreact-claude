import React from 'react';
import type { ReactNode } from 'react';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <nav className="nav">
        <a href="/">Home</a>
        <span className="nav-sep"> | </span>
        <a href="/songs">Songs</a>
        <span className="nav-sep"> | </span>
        <a href="/songs/new">Add Song</a>
      </nav>
      <main>{children}</main>
    </div>
  );
}
