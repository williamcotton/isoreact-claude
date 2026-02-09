// @vitest-environment node
import { describe } from 'vitest';
import { load } from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { createCliApp } from '@cli/cli-app';
import { registerRoutes } from '@shared/universal-app';
import { createTestExecutor } from './drivers/test-executor';
import { runSongFlowTests } from './specs/song-flow.spec';
import type { AppDriver } from './drivers/types';

describe('CLI Environment', () => {
  runSongFlowTests(async (): Promise<AppDriver> => {
    const executor = createTestExecutor();
    const app = createCliApp(executor);
    registerRoutes(app);

    let currentUrl = '/';
    let $: CheerioAPI = load('');

    async function visit(url: string) {
      currentUrl = url;
      const result = await app.exec(url);
      $ = load(result.html);
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
