import React from 'react';
import { Layout } from '@components/Layout';

export function Home() {
  return (
    <Layout>
      <h1>IsoReact</h1>
      <p>A universal React application with server-side rendering and client-side hydration.</p>
      <p>
        <a href="/songs">Browse songs</a>
        <span className="nav-sep"> | </span>
        <a href="/songs/new">Add a song</a>
      </p>
    </Layout>
  );
}
