import type { UniversalApp, UniversalRequest, GraphQLExecutor, RouteHandler } from '@shared/types';
import { Router } from '@shared/router';
import { parseQueryString } from '@shared/utils';
import { createBuilderResponse } from './builder-response';
import type { BuilderResult } from './builder-response';
import { serializeForInlineScript, renderHtmlShell } from '@server/html-shell';

export interface BuilderApp extends UniversalApp {
  build(path: string): Promise<BuilderResult | null>;
}

const MAX_REDIRECTS = 10;

export function createBuilderApp(
  graphqlExecutor: GraphQLExecutor,
  getAssets: () => { js: string[]; css: string[]; inlineCss?: string },
  saveToCache: (path: string, html: string) => void,
  removeFromCache: (path: string) => void,
): BuilderApp {
  const router = new Router();

  async function build(path: string, redirectCount: number = 0): Promise<BuilderResult | null> {
    const [pathname, search] = path.split('?');
    const matched = router.match('get', pathname ?? path);

    if (!matched) {
      removeFromCache(pathname ?? path);
      return null;
    }

    const graphqlCache: Record<string, any> = {};

    const req: UniversalRequest = {
      path: pathname ?? path,
      method: 'GET',
      params: matched.params,
      query: parseQueryString(search ?? ''),
      body: undefined,
      graphql: async (query, variables) => {
        const key = JSON.stringify({ query: query.trim(), variables });
        const result = await graphqlExecutor(query, variables);
        graphqlCache[key] = result;
        return result;
      },
    };

    const { response, getResult } = createBuilderResponse(graphqlCache);

    await matched.handler(req, response);

    const result = getResult();

    if (result.redirectUrl && redirectCount < MAX_REDIRECTS) {
      return build(result.redirectUrl, redirectCount + 1);
    }

    if (result.statusCode === 200 && result.appHtml) {
      const assets = getAssets();
      const initialData = serializeForInlineScript({ graphql: result.graphqlCache });
      const html = renderHtmlShell({ appHtml: result.appHtml, initialData, assets });
      saveToCache(pathname ?? path, html);
    } else {
      removeFromCache(pathname ?? path);
    }

    return result;
  }

  return {
    get(path: string, handler: RouteHandler) {
      router.add('get', path, handler);
    },
    post(path: string, handler: RouteHandler) {
      router.add('post', path, handler);
    },
    build(path: string) {
      return build(path);
    },
  };
}
