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
    const { SongDetail } = await import('@components/pages/SongDetail');
    res.renderApp(<SongDetail song={song} />);
  });

  app.post('/songs', async (req, res) => {
    const { title, artist, album, year } = req.body ?? {};
    await req.graphql(CREATE_SONG_MUTATION, {
      input: { title, artist, album: album || undefined, year: year || undefined },
    });
    res.redirect('/songs');
  });
}
