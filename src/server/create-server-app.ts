import React from 'react';
import { renderToString } from 'react-dom/server';
import type { Request, Response, Express } from 'express';
import type { UniversalApp, UniversalRequest, UniversalResponse, GraphQLExecutor } from '@shared/types';
import { parseQueryString } from '@shared/utils';

export function createServerApp(expressApp: Express, graphqlExecutor: GraphQLExecutor, getAssets: () => { js: string[]; css: string[] }): UniversalApp {
  function createHandler(handler: (req: UniversalRequest, res: UniversalResponse) => Promise<void> | void) {
    return async (expressReq: Request, expressRes: Response) => {
      const graphqlCache: Record<string, any> = {};

      const req: UniversalRequest = {
        path: expressReq.path,
        method: expressReq.method,
        params: expressReq.params as Record<string, string>,
        query: parseQueryString(expressReq.url.split('?')[1] ?? ''),
        body: expressReq.body,
        graphql: async (query, variables) => {
          const key = JSON.stringify({ query: query.trim(), variables });
          const result = await graphqlExecutor(query, variables);
          graphqlCache[key] = result;
          return result;
        },
      };

      const res: UniversalResponse = {
        renderApp(element) {
          const html = renderToString(element);
          const assets = getAssets();
          const cssLinks = assets.css.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n    ');
          const scriptTags = assets.js.map((src) => `<script defer src="${src}"></script>`).join('\n    ');

          expressRes.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>IsoReact</title>
    ${cssLinks}
</head>
<body>
    <div id="root">${html}</div>
    <script>window.__INITIAL_DATA__ = { graphql: ${JSON.stringify(graphqlCache)} };</script>
    ${scriptTags}
</body>
</html>`);
        },
        redirect(url) {
          expressRes.redirect(url);
        },
      };

      try {
        await handler(req, res);
      } catch (err) {
        console.error('Route error:', err);
        expressRes.status(500).send('Internal Server Error');
      }
    };
  }

  return {
    get(path, handler) {
      expressApp.get(path, createHandler(handler));
    },
    post(path, handler) {
      expressApp.post(path, createHandler(handler));
    },
  };
}
