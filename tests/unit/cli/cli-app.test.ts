// @vitest-environment node
import { describe, it, expect } from 'vitest';
import React from 'react';
import { createCliApp } from '@cli/cli-app';
import type { GraphQLExecutor } from '@shared/types';

const noopExecutor: GraphQLExecutor = async () => ({ data: null });

describe('createCliApp', () => {
  it('matches GET routes and returns HTML output', async () => {
    const app = createCliApp(noopExecutor);
    app.get('/hello', async (_req, res) => {
      res.renderApp(React.createElement('h1', null, 'Hello World'));
    });

    const result = await app.exec('/hello');
    expect(result.html).toBe('<h1>Hello World</h1>');
    expect(result.statusCode).toBe(200);
  });

  it('returns 404 for unmatched routes', async () => {
    const app = createCliApp(noopExecutor);
    app.get('/hello', async (_req, res) => {
      res.renderApp(React.createElement('h1', null, 'Hello'));
    });

    const result = await app.exec('/unknown');
    expect(result.statusCode).toBe(404);
  });

  it('matches POST routes with parsed body', async () => {
    const app = createCliApp(noopExecutor);
    app.post('/songs', async (req, res) => {
      const title = req.body?.title ?? 'none';
      res.renderApp(React.createElement('p', null, `Created: ${title}`));
    });

    const result = await app.exec('/songs', 'POST', 'title=Test+Song&artist=Me');
    expect(result.html).toBe('<p>Created: Test Song</p>');
    expect(result.statusCode).toBe(200);
  });

  it('follows redirects automatically', async () => {
    const app = createCliApp(noopExecutor);
    app.post('/songs', async (_req, res) => {
      res.redirect('/songs');
    });
    app.get('/songs', async (_req, res) => {
      res.renderApp(React.createElement('h1', null, 'Song List'));
    });

    const result = await app.exec('/songs', 'POST');
    expect(result.html).toBe('<h1>Song List</h1>');
    expect(result.statusCode).toBe(200);
  });

  it('captures status codes', async () => {
    const app = createCliApp(noopExecutor);
    app.get('/error', async (_req, res) => {
      res.setStatus(500);
      res.renderApp(React.createElement('p', null, 'Error'));
    });

    const result = await app.exec('/error');
    expect(result.statusCode).toBe(500);
  });

  it('extracts route params', async () => {
    const app = createCliApp(noopExecutor);
    app.get('/songs/:id', async (req, res) => {
      res.renderApp(React.createElement('p', null, `Song ${req.params.id}`));
    });

    const result = await app.exec('/songs/42');
    expect(result.html).toBe('<p>Song 42</p>');
  });

  it('parses query strings', async () => {
    const app = createCliApp(noopExecutor);
    app.get('/search', async (req, res) => {
      res.renderApp(React.createElement('p', null, `Query: ${req.query.q}`));
    });

    const result = await app.exec('/search?q=hello');
    expect(result.html).toBe('<p>Query: hello</p>');
  });

  it('defaults method to GET', async () => {
    const app = createCliApp(noopExecutor);
    app.get('/test', async (_req, res) => {
      res.renderApp(React.createElement('p', null, 'OK'));
    });

    const result = await app.exec('/test');
    expect(result.html).toBe('<p>OK</p>');
  });
});
