// @vitest-environment node
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import React from 'react';
import { createServerApp } from '@server/create-server-app';

const dummyExecutor = async (query: string, variables?: Record<string, unknown>) => ({
  data: { test: 'value' } as any,
});

const defaultAssets = () => ({
  js: ['/static/main.js'],
  css: ['/static/style.css'],
});

describe('createServerApp', () => {
  describe('serializeForInlineScript (via HTML output)', () => {
    it('escapes < and > to prevent </script> injection', async () => {
      const app = express();
      const executor = async () => ({ data: { xss: '</script><script>alert(1)</script>' } as any });
      const universalApp = createServerApp(app, executor, defaultAssets);
      universalApp.get('/test', async (req, res) => {
        await req.graphql('{ test }');
        res.renderApp(React.createElement('div', null, 'test'));
      });

      const res = await request(app).get('/test');
      expect(res.text).not.toContain('</script><script>');
      expect(res.text).toContain('\\u003C/script\\u003E');
    });

    it('escapes &', async () => {
      const app = express();
      const executor = async () => ({ data: { val: 'a&b' } as any });
      const universalApp = createServerApp(app, executor, defaultAssets);
      universalApp.get('/test', async (req, res) => {
        await req.graphql('{ test }');
        res.renderApp(React.createElement('div', null, 'test'));
      });

      const res = await request(app).get('/test');
      const scriptContent = res.text.match(/window\.__INITIAL_DATA__ = (.+);/)?.[1] ?? '';
      expect(scriptContent).toContain('\\u0026');
      expect(scriptContent).not.toMatch(/[^\\]&/);
    });

    it('escapes U+2028 and U+2029 line/paragraph separators', async () => {
      const app = express();
      const executor = async () => ({ data: { val: 'a\u2028b\u2029c' } as any });
      const universalApp = createServerApp(app, executor, defaultAssets);
      universalApp.get('/test', async (req, res) => {
        await req.graphql('{ test }');
        res.renderApp(React.createElement('div', null, 'test'));
      });

      const res = await request(app).get('/test');
      const scriptContent = res.text.match(/window\.__INITIAL_DATA__ = (.+);/)?.[1] ?? '';
      expect(scriptContent).toContain('\\u2028');
      expect(scriptContent).toContain('\\u2029');
    });
  });

  describe('request/response mapping', () => {
    it('receives correct req.path, req.method, req.params', async () => {
      const app = express();
      const universalApp = createServerApp(app, dummyExecutor, defaultAssets);

      let captured: any = {};
      universalApp.get('/songs/:id', async (req, res) => {
        captured = { path: req.path, method: req.method, params: req.params };
        res.renderApp(React.createElement('div', null, 'ok'));
      });

      await request(app).get('/songs/42');
      expect(captured.path).toBe('/songs/42');
      expect(captured.method).toBe('GET');
      expect(captured.params).toEqual({ id: '42' });
    });

    it('parses query string into req.query', async () => {
      const app = express();
      const universalApp = createServerApp(app, dummyExecutor, defaultAssets);

      let capturedQuery: any = {};
      universalApp.get('/search', async (req, res) => {
        capturedQuery = req.query;
        res.renderApp(React.createElement('div', null, 'ok'));
      });

      await request(app).get('/search?q=hello&page=2');
      expect(capturedQuery).toEqual({ q: 'hello', page: '2' });
    });

    it('provides POST body as req.body', async () => {
      const app = express();
      app.use(express.urlencoded({ extended: true }));
      const universalApp = createServerApp(app, dummyExecutor, defaultAssets);

      let capturedBody: any = {};
      universalApp.post('/submit', async (req, res) => {
        capturedBody = req.body;
        res.renderApp(React.createElement('div', null, 'ok'));
      });

      await request(app)
        .post('/submit')
        .type('form')
        .send('title=Test&artist=Foo');
      expect(capturedBody).toEqual({ title: 'Test', artist: 'Foo' });
    });

    it('renderApp produces full HTML document', async () => {
      const app = express();
      const universalApp = createServerApp(app, dummyExecutor, defaultAssets);
      universalApp.get('/test', async (_req, res) => {
        res.renderApp(React.createElement('div', null, 'Hello'));
      });

      const res = await request(app).get('/test');
      expect(res.text).toContain('<!DOCTYPE html>');
      expect(res.text).toContain('<div id="root">');
      expect(res.text).toContain('__INITIAL_DATA__');
      expect(res.text).toContain('Hello');
    });

    it('setStatus sets the HTTP status code', async () => {
      const app = express();
      const universalApp = createServerApp(app, dummyExecutor, defaultAssets);
      universalApp.get('/not-found', async (_req, res) => {
        res.setStatus(404);
        res.renderApp(React.createElement('div', null, 'Not Found'));
      });

      const res = await request(app).get('/not-found');
      expect(res.status).toBe(404);
    });

    it('redirect sends 302', async () => {
      const app = express();
      const universalApp = createServerApp(app, dummyExecutor, defaultAssets);
      universalApp.get('/old', async (_req, res) => {
        res.redirect('/new');
      });

      const res = await request(app).get('/old');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/new');
    });

    it('req.graphql results are cached in __INITIAL_DATA__', async () => {
      const app = express();
      const executor = async (query: string) => ({
        data: { songs: [{ id: '1', title: 'Test' }] } as any,
      });
      const universalApp = createServerApp(app, executor, defaultAssets);
      universalApp.get('/test', async (req, res) => {
        await req.graphql('{ songs { id title } }');
        res.renderApp(React.createElement('div', null, 'ok'));
      });

      const res = await request(app).get('/test');
      expect(res.text).toContain('__INITIAL_DATA__');
      expect(res.text).toContain('songs');
    });

    it('includes JS and CSS assets in rendered HTML', async () => {
      const app = express();
      const universalApp = createServerApp(app, dummyExecutor, () => ({
        js: ['/static/main.js', '/static/vendors.js'],
        css: ['/static/style.css'],
      }));
      universalApp.get('/test', async (_req, res) => {
        res.renderApp(React.createElement('div', null, 'ok'));
      });

      const res = await request(app).get('/test');
      expect(res.text).toContain('src="/static/main.js"');
      expect(res.text).toContain('src="/static/vendors.js"');
      expect(res.text).toContain('href="/static/style.css"');
    });

    it('inline CSS mode uses <style> tag instead of <link>', async () => {
      const app = express();
      const universalApp = createServerApp(app, dummyExecutor, () => ({
        js: ['/static/main.js'],
        css: [],
        inlineCss: 'body { color: red; }',
      }));
      universalApp.get('/test', async (_req, res) => {
        res.renderApp(React.createElement('div', null, 'ok'));
      });

      const res = await request(app).get('/test');
      expect(res.text).toContain('<style>body { color: red; }</style>');
      expect(res.text).not.toContain('<link rel="stylesheet"');
    });

    it('route handler errors return 500', async () => {
      const app = express();
      const universalApp = createServerApp(app, dummyExecutor, defaultAssets);
      universalApp.get('/error', async () => {
        throw new Error('boom');
      });

      const res = await request(app).get('/error');
      expect(res.status).toBe(500);
      expect(res.text).toContain('Internal Server Error');
    });
  });
});
