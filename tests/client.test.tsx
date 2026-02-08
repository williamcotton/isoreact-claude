// @vitest-environment jsdom
import { describe, afterEach } from 'vitest';
import { act } from 'react';
import { load } from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { createBrowserApp } from '@client/browser-express/browser-app';
import type { BrowserApp } from '@client/browser-express/browser-app';
import { registerRoutes } from '@shared/universal-app';
import { createTestExecutor } from './drivers/test-executor';
import { runSongFlowTests } from './specs/song-flow.spec';
import type { AppDriver } from './drivers/types';

describe('Client Environment (Hydration)', () => {
  let app: BrowserApp | null = null;

  afterEach(() => {
    app?.destroy();
    app = null;
    document.body.innerHTML = '';
  });

  runSongFlowTests(async (): Promise<AppDriver> => {
    const executor = createTestExecutor();
    app = createBrowserApp(executor);
    registerRoutes(app);

    let started = false;

    async function waitForContent(): Promise<void> {
      // Poll until the root has content, with a timeout
      const rootEl = document.getElementById('root');
      const start = Date.now();
      while ((!rootEl || !rootEl.innerHTML) && Date.now() - start < 2000) {
        await act(async () => {
          await new Promise((r) => setTimeout(r, 10));
        });
      }
      // One final act flush for React to settle
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
    }

    async function waitForUpdate(previousHtml: string): Promise<void> {
      const rootEl = document.getElementById('root');
      const start = Date.now();
      while (rootEl?.innerHTML === previousHtml && Date.now() - start < 2000) {
        await act(async () => {
          await new Promise((r) => setTimeout(r, 10));
        });
      }
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
    }

    return {
      async visit(url: string) {
        if (!started) {
          document.body.innerHTML = '<div id="root"></div>';
          window.history.pushState(null, '', url);
          app!.start();
          await waitForContent();
          started = true;
        } else {
          const prevHtml = document.getElementById('root')?.innerHTML ?? '';
          window.history.pushState(null, '', url);
          window.dispatchEvent(new PopStateEvent('popstate'));
          await waitForUpdate(prevHtml);
        }
      },
      async clickLink(text: string) {
        const rootEl = document.getElementById('root')!;
        const prevHtml = rootEl.innerHTML;
        const links = rootEl.querySelectorAll('a');
        let target: HTMLAnchorElement | null = null;

        for (const link of links) {
          if (link.textContent?.trim() === text) {
            target = link;
            break;
          }
        }

        if (!target) {
          throw new Error(`Link with text "${text}" not found`);
        }

        target.click();
        await waitForUpdate(prevHtml);
      },
      getCurrentUrl() {
        return window.location.pathname;
      },
      get $(): CheerioAPI {
        const rootEl = document.getElementById('root');
        return load(rootEl?.innerHTML ?? '');
      },
    };
  });
});
