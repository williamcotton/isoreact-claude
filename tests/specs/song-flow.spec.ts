import { test, expect, beforeEach } from 'vitest';
import type { AppDriver } from '../drivers/types';

export function runSongFlowTests(createDriver: () => Promise<AppDriver>) {
  let app: AppDriver;

  beforeEach(async () => {
    app = await createDriver();
  });

  test('renders home page with heading', async () => {
    await app.visit('/');
    expect(app.$('h1').first().text()).toBe('IsoReact');
  });

  test('navigates from home to song list', async () => {
    await app.visit('/');
    await app.clickLink('Browse songs');

    expect(app.getCurrentUrl()).toBe('/songs');
    expect(app.$('h1').first().text()).toBe('Songs');

    const items = app.$('ul li').map((_, el) => app.$(el).text()).get();
    expect(items).toEqual(expect.arrayContaining([
      expect.stringContaining('Bohemian Rhapsody'),
    ]));
    expect(items).toHaveLength(3);
  });

  test('shows song detail page', async () => {
    await app.visit('/songs/1');
    expect(app.$('h1').first().text()).toBe('Bohemian Rhapsody');
    expect(app.$('dd').first().text()).toBe('Queen');
  });

  test('shows 404 for missing song', async () => {
    await app.visit('/songs/999');
    expect(app.$('h1').first().text()).toBe('Song Not Found');
  });

  test('shows create song form', async () => {
    await app.visit('/songs/new');
    expect(app.$('h1').first().text()).toBe('Add Song');
    expect(app.$('form').attr('action')).toBe('/songs');
    expect(app.$('input#title').length).toBe(1);
  });
}
