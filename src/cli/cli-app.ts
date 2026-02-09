import type { UniversalApp, GraphQLExecutor, RouteHandler } from '@shared/types';
import { Router } from '@shared/router';
import { createCliRequest } from './cli-request';
import { createCliResponse } from './cli-response';
import type { CliResult } from './cli-response';

export interface CliApp extends UniversalApp {
  exec(path: string, method?: string, body?: string): Promise<CliResult>;
}

const MAX_REDIRECTS = 10;

export function createCliApp(graphql: GraphQLExecutor): CliApp {
  const router = new Router();

  async function exec(path: string, method: string = 'GET', body?: string, redirectCount: number = 0): Promise<CliResult> {
    const [pathname] = path.split('?');
    const matched = router.match(method.toLowerCase(), pathname ?? path);

    if (!matched) {
      return { html: '<h1>Not Found</h1>', statusCode: 404, redirectUrl: null };
    }

    const req = createCliRequest(path, method, matched.params, graphql, body);
    const { response, getResult } = createCliResponse();

    await matched.handler(req, response);

    const result = getResult();

    if (result.redirectUrl && redirectCount < MAX_REDIRECTS) {
      return exec(result.redirectUrl, 'GET', undefined, redirectCount + 1);
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
    exec(path: string, method?: string, body?: string) {
      return exec(path, method, body);
    },
  };
}
