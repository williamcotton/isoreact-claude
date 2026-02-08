// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { Home } from '@components/pages/Home';
import { renderComponent } from './render-helper';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Home', () => {
  it('renders heading "IsoReact"', async () => {
    const { $ } = await renderComponent(<Home />);
    expect($('h1').text()).toBe('IsoReact');
  });

  it('contains "Browse songs" link to /songs', async () => {
    const { $ } = await renderComponent(<Home />);
    const link = $('a').filter((_, el) => $(el).text() === 'Browse songs');
    expect(link.length).toBe(1);
    expect(link.attr('href')).toBe('/songs');
  });

  it('contains "Add a song" link to /songs/new', async () => {
    const { $ } = await renderComponent(<Home />);
    const link = $('a').filter((_, el) => $(el).text() === 'Add a song');
    expect(link.length).toBe(1);
    expect(link.attr('href')).toBe('/songs/new');
  });
});
