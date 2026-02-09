import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import type { UniversalResponse } from '@shared/types';

export interface CliResult {
  html: string;
  statusCode: number;
  redirectUrl: string | null;
}

export function createCliResponse(): { response: UniversalResponse; getResult: () => CliResult } {
  let html = '';
  let statusCode = 200;
  let redirectUrl: string | null = null;

  const response: UniversalResponse = {
    renderApp(element: ReactElement) {
      html = renderToStaticMarkup(element);
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
      return { html, statusCode, redirectUrl };
    },
  };
}
