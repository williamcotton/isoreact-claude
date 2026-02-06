import { hydrateRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { UniversalApp, GraphQLExecutor, RouteHandler } from '@shared/types';
import { Router } from './router';
import { createBrowserRequest } from './browser-request';
import { createBrowserResponse } from './browser-response';
import { setupInterceptor } from './interceptor';

export interface BrowserApp extends UniversalApp {
  start(): void;
}

export function createBrowserApp(graphql: GraphQLExecutor): BrowserApp {
  const router = new Router();
  let root: Root;
  let hydrated = false;

  async function handleNavigation(path: string, method: string, body?: any) {
    const [pathname] = path.split('?');
    const matched = router.match(method.toLowerCase(), pathname ?? path);
    if (!matched) {
      console.warn(`No route matched: ${method} ${path}`);
      return;
    }

    const req = createBrowserRequest(path, method, matched.params, graphql, body);
    const res = createBrowserResponse(root);

    try {
      await matched.handler(req, res);
    } catch (err) {
      console.error('Route error:', err);
    }
  }

  return {
    get(path: string, handler: RouteHandler) {
      router.add('get', path, handler);
    },
    post(path: string, handler: RouteHandler) {
      router.add('post', path, handler);
    },
    start() {
      const container = document.getElementById('root')!;
      const path = window.location.pathname + window.location.search;
      const [pathname] = path.split('?');
      const matched = router.match('get', pathname ?? path);

      if (!matched) {
        console.warn('No route matched for initial hydration');
        return;
      }

      const req = createBrowserRequest(path, 'GET', matched.params, graphql);

      // For hydration, we render into the existing server HTML
      const res = {
        renderApp(element: any) {
          root = hydrateRoot(container, element);
          hydrated = true;
        },
        redirect(url: string) {
          window.location.href = url;
        },
      };

      matched.handler(req, res);

      // After hydration, intercept future navigations
      setupInterceptor(handleNavigation);
    },
  };
}
