// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { SongList } from '@components/pages/SongList';
import { renderComponent } from './render-helper';
import type { Song } from '@shared/graphql';

afterEach(() => {
  document.body.innerHTML = '';
});

const songs: Song[] = [
  { id: '1', title: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night at the Opera' },
  { id: '2', title: 'Imagine', artist: 'John Lennon' },
];

describe('SongList', () => {
  it('renders heading "Songs"', async () => {
    const { $ } = await renderComponent(<SongList initialData={songs} />);
    expect($('h1').text()).toBe('Songs');
  });

  it('renders each song as a list item with link and artist', async () => {
    const { $ } = await renderComponent(<SongList initialData={songs} />);
    const items = $('ul li');
    expect(items.length).toBe(2);
    expect(items.eq(0).text()).toContain('Bohemian Rhapsody');
    expect(items.eq(0).text()).toContain('Queen');
    expect(items.eq(1).text()).toContain('Imagine');
    expect(items.eq(1).text()).toContain('John Lennon');
  });

  it('song links go to /songs/:id', async () => {
    const { $ } = await renderComponent(<SongList initialData={songs} />);
    const hrefs = $('ul li a')
      .map((_, el) => $(el).attr('href'))
      .get();
    expect(hrefs).toEqual(['/songs/1', '/songs/2']);
  });

  it('shows album in parentheses when present', async () => {
    const { $ } = await renderComponent(<SongList initialData={songs} />);
    const items = $('ul li');
    expect(items.eq(0).text()).toContain('(A Night at the Opera)');
    expect(items.eq(1).text()).not.toContain('(');
  });

  it('empty list shows "No songs yet" message with "Add one!" link', async () => {
    const { $ } = await renderComponent(<SongList initialData={[]} />);
    expect($('p').text()).toContain('No songs yet');
    const link = $('a').filter((_, el) => $(el).text() === 'Add one!');
    expect(link.length).toBe(1);
    expect(link.attr('href')).toBe('/songs/new');
  });
});
