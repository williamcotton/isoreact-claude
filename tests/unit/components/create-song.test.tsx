// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { CreateSong } from '@components/pages/CreateSong';
import { renderComponent } from './render-helper';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('CreateSong', () => {
  it('renders heading "Add Song"', async () => {
    const { $ } = await renderComponent(<CreateSong />);
    expect($('h1').text()).toBe('Add Song');
  });

  it('form has action="/songs" and method="POST"', async () => {
    const { $ } = await renderComponent(<CreateSong />);
    const form = $('form');
    expect(form.attr('action')).toBe('/songs');
    expect(form.attr('method')).toBe('POST');
  });

  it('has required fields: title, artist', async () => {
    const { $ } = await renderComponent(<CreateSong />);
    const titleInput = $('input[name="title"]');
    const artistInput = $('input[name="artist"]');
    expect(titleInput.length).toBe(1);
    expect(titleInput.attr('required')).toBeDefined();
    expect(artistInput.length).toBe(1);
    expect(artistInput.attr('required')).toBeDefined();
  });

  it('has optional fields: album, year', async () => {
    const { $ } = await renderComponent(<CreateSong />);
    const albumInput = $('input[name="album"]');
    const yearInput = $('input[name="year"]');
    expect(albumInput.length).toBe(1);
    expect(albumInput.attr('required')).toBeUndefined();
    expect(yearInput.length).toBe(1);
    expect(yearInput.attr('required')).toBeUndefined();
  });

  it('no error message by default', async () => {
    const { $ } = await renderComponent(<CreateSong />);
    expect($('[role="alert"]').length).toBe(0);
  });

  it('shows error message with role="alert" when errorMessage prop set', async () => {
    const { $ } = await renderComponent(
      <CreateSong errorMessage="Title is required" />,
    );
    const alert = $('[role="alert"]');
    expect(alert.length).toBe(1);
    expect(alert.text()).toBe('Title is required');
  });

  it('pre-fills inputs when initialValues provided', async () => {
    const { $ } = await renderComponent(
      <CreateSong
        initialValues={{
          title: 'Yesterday',
          artist: 'The Beatles',
          album: 'Help!',
          year: '1965',
        }}
      />,
    );
    expect($('input[name="title"]').attr('value')).toBe('Yesterday');
    expect($('input[name="artist"]').attr('value')).toBe('The Beatles');
    expect($('input[name="album"]').attr('value')).toBe('Help!');
    expect($('input[name="year"]').attr('value')).toBe('1965');
  });
});
