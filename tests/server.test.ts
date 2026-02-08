// @vitest-environment node
import { describe } from 'vitest';
import express from 'express';
import request from 'supertest';
import { load } from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { createServerApp } from '@server/create-server-app';
import { registerRoutes } from '@shared/universal-app';
import { createTestExecutor } from './drivers/test-executor';
import { runSongFlowTests } from './specs/song-flow.spec';
import type { AppDriver } from './drivers/types';

describe('Server Environment (SSR)', () => {
  runSongFlowTests(async (): Promise<AppDriver> => {
    const expressApp = express();
    expressApp.use(express.json());
    expressApp.use(express.urlencoded({ extended: true }));

    const executor = createTestExecutor();
    const universalApp = createServerApp(expressApp, executor, () => ({ js: [], css: [] }));
    registerRoutes(universalApp);

    let html = '';
    let currentUrl = '/';
    let $: CheerioAPI = load('');

    async function visit(url: string) {
      currentUrl = url;
      const res = await request(expressApp).get(url);
      html = res.text;
      $ = load(html);
    }

    return {
      visit,
      async clickLink(text: string) {
        const href = $(`a`).filter((_, el) => $(el).text().trim() === text).attr('href');
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
