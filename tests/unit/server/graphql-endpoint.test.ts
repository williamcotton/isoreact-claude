// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Express } from 'express';
import { createGraphQLEndpoint } from '@server/graphql/endpoint';
import { createSchema } from '@shared/graphql/schema';
import type { Song } from '@shared/graphql';

const SEED_SONGS: Song[] = [
  { id: '1', title: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night at the Opera', year: '1975' },
  { id: '2', title: 'Hotel California', artist: 'Eagles', album: 'Hotel California', year: '1977' },
  { id: '3', title: 'Stairway to Heaven', artist: 'Led Zeppelin', album: 'Led Zeppelin IV', year: '1971' },
];

function createApp(): Express {
  let nextId = 4;
  const songs: Song[] = SEED_SONGS.map((s) => ({ ...s }));

  const dataStore = {
    getSongs: () => [...songs],
    getSong: (id: string) => songs.find((s) => s.id === id),
    getSongsByArtist: (artist: string) =>
      songs.filter((s) => s.artist.toLowerCase() === artist.toLowerCase()),
    createSong: (input: Omit<Song, 'id'>) => {
      const song: Song = { id: String(nextId++), ...input };
      songs.push(song);
      return song;
    },
    updateSong: (id: string, input: Partial<Omit<Song, 'id'>>) => {
      const song = songs.find((s) => s.id === id);
      if (!song) return null;
      Object.assign(song, input);
      return song;
    },
    deleteSong: (id: string) => {
      const idx = songs.findIndex((s) => s.id === id);
      if (idx === -1) return false;
      songs.splice(idx, 1);
      return true;
    },
  };

  const schema = createSchema(dataStore);
  const app = express();
  app.use(express.json());
  app.post('/graphql', createGraphQLEndpoint(schema));
  return app;
}

describe('GraphQL endpoint', () => {
  let app: Express;

  beforeEach(() => {
    app = createApp();
  });

  it('returns 200 with data for valid query', async () => {
    const res = await request(app)
      .post('/graphql')
      .send({ query: '{ songs { id title } }' });
    expect(res.status).toBe(200);
    expect(res.body.data.songs).toHaveLength(3);
  });

  it('returns 400 when query field is missing', async () => {
    const res = await request(app).post('/graphql').send({});
    expect(res.status).toBe(400);
    expect(res.body.errors[0].message).toBe('Missing query');
  });

  it('returns 400 for empty query string', async () => {
    const res = await request(app).post('/graphql').send({ query: '  ' });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].message).toBe('Missing query');
  });

  it('returns 400 for non-string query', async () => {
    const res = await request(app).post('/graphql').send({ query: 123 });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].message).toBe('Missing query');
  });

  it('passes variables through to execution', async () => {
    const res = await request(app)
      .post('/graphql')
      .send({ query: 'query($id: String!) { song(id: $id) { title } }', variables: { id: '1' } });
    expect(res.status).toBe(200);
    expect(res.body.data.song.title).toBe('Bohemian Rhapsody');
  });

  it('returns 400 for query with errors and no data', async () => {
    const res = await request(app)
      .post('/graphql')
      .send({ query: '{ nonExistentField }' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('maps error messages to { message } format', async () => {
    const res = await request(app)
      .post('/graphql')
      .send({ query: '{ nonExistentField }' });
    for (const err of res.body.errors) {
      expect(Object.keys(err)).toEqual(['message']);
    }
  });
});
