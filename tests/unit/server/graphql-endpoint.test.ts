// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Express } from 'express';
import { createGraphQLEndpoint } from '@server/graphql/endpoint';
import { createSchema } from '@shared/graphql/schema';
import { createDataStore } from '@server/graphql/data-store';

function createApp(): Express {
  const schema = createSchema(createDataStore());
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
