import React from 'react';
import { renderToString } from 'react-dom/server';
import type { Request, Response, Express } from 'express';
import type { UniversalApp, UniversalRequest, UniversalResponse, GraphQLExecutor } from '@shared/types';
import { parseQueryString } from '@shared/utils';
import { serializeForInlineScript, renderHtmlShell } from './html-shell';

export function createServerApp(expressApp: Express, graphqlExecutor: GraphQLExecutor, getAssets: () => { js: string[]; css: string[]; inlineCss?: string }): UniversalApp {
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
          const appHtml = renderToString(element);
          const assets = getAssets();
          const initialData = serializeForInlineScript({ graphql: graphqlCache });

          expressRes.send(renderHtmlShell({ appHtml, initialData, assets }));
        },
        setStatus(code) {
          expressRes.status(code);
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
