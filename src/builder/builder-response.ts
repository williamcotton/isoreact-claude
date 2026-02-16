import { renderToString } from 'react-dom/server';
import type { ReactElement } from 'react';
import type { UniversalResponse } from '@shared/types';

export interface BuilderResult {
  appHtml: string;
  graphqlCache: Record<string, any>;
  statusCode: number;
  redirectUrl: string | null;
}

export function createBuilderResponse(graphqlCache: Record<string, any>): { response: UniversalResponse; getResult: () => BuilderResult } {
  let appHtml = '';
  let statusCode = 200;
  let redirectUrl: string | null = null;

  const response: UniversalResponse = {
    renderApp(element: ReactElement) {
      appHtml = renderToString(element);
    },
    setStatus(code: number) {
      statusCode = code;
    },
    redirect(url: string) {
      redirectUrl = url;
    },
  };

  return {
    response,
    getResult() {
      return { appHtml, graphqlCache, statusCode, redirectUrl };
    },
  };
}
