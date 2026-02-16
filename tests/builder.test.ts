// @vitest-environment node
import { describe } from 'vitest';
import { load } from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { createBuilderApp } from '@builder/builder-app';
import { registerRoutes } from '@shared/universal-app';
import { createTestExecutor } from './drivers/test-executor';
import { runSongFlowTests } from './specs/song-flow.spec';
import type { AppDriver } from './drivers/types';

describe('Builder Environment', () => {
  runSongFlowTests(async (): Promise<AppDriver> => {
    const executor = createTestExecutor();
    const cache = new Map<string, string>();
    const assets = { js: ['/static/vendors.js', '/static/main.js'], css: ['/static/main.css'] };
    const app = createBuilderApp(
      executor,
      () => assets,
      (path, html) => cache.set(path, html),
      (path) => cache.delete(path),
    );
    registerRoutes(app);

    let currentUrl = '/';
    let $: CheerioAPI = load('');

    async function visit(url: string) {
      currentUrl = url;
      const result = await app.build(url);
      // Use appHtml from result for all pages (including 404s that aren't cached)
      $ = result?.appHtml ? load(result.appHtml) : load('');
    }

    return {
      visit,
      async clickLink(text: string) {
        const href = $('a').filter((_, el) => $(el).text().trim() === text).attr('href');
        if (!href) {
          throw new Error(`Link with text "${text}" not found`);
        }
        await visit(href);
      },
      getCurrentUrl() {
        return currentUrl;
      },
      get $() {
        return $;
      },
    };
  });
});
