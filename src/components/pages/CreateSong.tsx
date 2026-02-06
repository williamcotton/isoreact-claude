import React from 'react';
import { Layout } from '@components/Layout';

export function CreateSong() {
  return (
    <Layout>
      <h1>Add Song</h1>
      <form action="/songs" method="POST">
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input type="text" id="title" name="title" required />
        </div>
        <div className="form-group">
          <label htmlFor="artist">Artist *</label>
          <input type="text" id="artist" name="artist" required />
        </div>
        <div className="form-group">
          <label htmlFor="album">Album</label>
          <input type="text" id="album" name="album" />
        </div>
        <div className="form-group">
          <label htmlFor="year">Year</label>
          <input type="text" id="year" name="year" />
        </div>
        <button type="submit">Create Song</button>
      </form>
    </Layout>
  );
}
