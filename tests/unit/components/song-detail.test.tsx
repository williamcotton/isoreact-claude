// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { SongDetail } from '@components/pages/SongDetail';
import { renderComponent } from './render-helper';
import type { Song } from '@shared/graphql';

afterEach(() => {
  document.body.innerHTML = '';
});

const fullSong: Song = {
  id: '1',
  title: 'Bohemian Rhapsody',
  artist: 'Queen',
  album: 'A Night at the Opera',
  year: '1975',
};

const minimalSong: Song = {
  id: '2',
  title: 'Imagine',
  artist: 'John Lennon',
};

describe('SongDetail', () => {
  it('renders song title as heading', async () => {
    const { $ } = await renderComponent(<SongDetail song={fullSong} />);
    expect($('h1').text()).toBe('Bohemian Rhapsody');
  });

  it('shows artist in definition list', async () => {
    const { $ } = await renderComponent(<SongDetail song={fullSong} />);
    const dts = $('dt');
    const dds = $('dd');
    expect(dts.eq(0).text()).toBe('Artist');
    expect(dds.eq(0).text()).toBe('Queen');
  });

  it('shows album when present', async () => {
    const { $ } = await renderComponent(<SongDetail song={fullSong} />);
    const dtTexts = $('dt')
      .map((_, el) => $(el).text())
      .get();
    expect(dtTexts).toContain('Album');
    const albumIndex = dtTexts.indexOf('Album');
    expect($('dd').eq(albumIndex).text()).toBe('A Night at the Opera');
  });

  it('shows year when present', async () => {
    const { $ } = await renderComponent(<SongDetail song={fullSong} />);
    const dtTexts = $('dt')
      .map((_, el) => $(el).text())
      .get();
    expect(dtTexts).toContain('Year');
    const yearIndex = dtTexts.indexOf('Year');
    expect($('dd').eq(yearIndex).text()).toBe('1975');
  });

  it('omits album when absent', async () => {
    const { $ } = await renderComponent(<SongDetail song={minimalSong} />);
    const dtTexts = $('dt')
      .map((_, el) => $(el).text())
      .get();
    expect(dtTexts).not.toContain('Album');
  });

  it('omits year when absent', async () => {
    const { $ } = await renderComponent(<SongDetail song={minimalSong} />);
    const dtTexts = $('dt')
      .map((_, el) => $(el).text())
      .get();
    expect(dtTexts).not.toContain('Year');
  });

  it('null song shows "Song Not Found" heading', async () => {
    const { $ } = await renderComponent(<SongDetail song={null} />);
    expect($('h1').text()).toBe('Song Not Found');
  });

  it('"Back to songs" link to /songs', async () => {
    const { $ } = await renderComponent(<SongDetail song={fullSong} />);
    const link = $('a').filter((_, el) => $(el).text() === 'Back to songs');
    expect(link.length).toBe(1);
    expect(link.attr('href')).toBe('/songs');
  });
});
