import React from 'react';
import type { UniversalApp } from './types';
import { SONGS_QUERY, SONG_QUERY, CREATE_SONG_MUTATION } from './graphql';
import type { Song } from './graphql';

export function registerRoutes(app: UniversalApp) {
  app.get('/', async (_req, res) => {
    const { Home } = await import('@components/pages/Home');
    res.renderApp(<Home />);
  });

  app.get('/songs', async (req, res) => {
    const result = await req.graphql<{ songs: Song[] }>(SONGS_QUERY);
    const songs = result.data?.songs ?? [];
    const { SongList } = await import('@components/pages/SongList');
    res.renderApp(<SongList initialData={songs} />);
  });

  app.get('/songs/new', async (_req, res) => {
    const { CreateSong } = await import('@components/pages/CreateSong');
    res.renderApp(<CreateSong />);
  });

  app.get('/songs/:id', async (req, res) => {
    const result = await req.graphql<{ song: Song | null }>(SONG_QUERY, { id: req.params.id });
    const song = result.data?.song ?? null;
    if (!song) {
      res.setStatus(404);
    }
    const { SongDetail } = await import('@components/pages/SongDetail');
    res.renderApp(<SongDetail song={song} />);
  });

  app.post('/songs', async (req, res) => {
    const body = req.body ?? {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const artist = typeof body.artist === 'string' ? body.artist.trim() : '';
    const album = typeof body.album === 'string' ? body.album.trim() : '';
    const year = typeof body.year === 'string' ? body.year.trim() : '';

    const { CreateSong } = await import('@components/pages/CreateSong');
    const initialValues = { title, artist, album, year };

    if (!title || !artist) {
      res.setStatus(400);
      res.renderApp(
        <CreateSong errorMessage="Title and artist are required." initialValues={initialValues} />
      );
      return;
    }

    const result = await req.graphql<{ createSong: Song | null }>(CREATE_SONG_MUTATION, {
      input: {
        title,
        artist,
        album: album || undefined,
        year: year || undefined,
      },
    });

    if (result.errors?.length || !result.data?.createSong) {
      const message =
        result.errors?.map((error) => error.message).join(' ') ||
        'Unable to create song. Please check the form and try again.';
      res.setStatus(400);
      res.renderApp(<CreateSong errorMessage={message} initialValues={initialValues} />);
      return;
    }

    res.redirect('/songs');
  });
}
