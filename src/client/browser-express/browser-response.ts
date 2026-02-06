import type { ReactElement } from 'react';
import type { Root } from 'react-dom/client';
import type { UniversalResponse } from '@shared/types';

export function createBrowserResponse(root: Root): UniversalResponse {
  return {
    renderApp(element: ReactElement) {
      root.render(element);
    },
    redirect(url: string) {
      window.history.pushState(null, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
  };
}
