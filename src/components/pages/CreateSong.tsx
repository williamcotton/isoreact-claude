import React from 'react';
import { Layout } from '@components/Layout';

interface CreateSongProps {
  errorMessage?: string;
  initialValues?: {
    title?: string;
    artist?: string;
    album?: string;
    year?: string;
  };
}

export function CreateSong({ errorMessage, initialValues }: CreateSongProps = {}) {
  const values = initialValues ?? {};

  return (
    <Layout>
      <h1>Add Song</h1>
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      <form action="/songs" method="POST">
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input type="text" id="title" name="title" defaultValue={values.title ?? ''} required />
        </div>
        <div className="form-group">
          <label htmlFor="artist">Artist *</label>
          <input type="text" id="artist" name="artist" defaultValue={values.artist ?? ''} required />
        </div>
        <div className="form-group">
          <label htmlFor="album">Album</label>
          <input type="text" id="album" name="album" defaultValue={values.album ?? ''} />
        </div>
        <div className="form-group">
          <label htmlFor="year">Year</label>
          <input type="text" id="year" name="year" defaultValue={values.year ?? ''} />
        </div>
        <button type="submit">Create Song</button>
      </form>
    </Layout>
  );
}
