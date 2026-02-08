// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { Layout } from '@components/Layout';
import { renderComponent } from './render-helper';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Layout', () => {
  it('renders nav with Home, Songs, Add Song links', async () => {
    const { $ } = await renderComponent(<Layout>content</Layout>);
    const linkTexts = $('nav a')
      .map((_, el) => $(el).text())
      .get();
    expect(linkTexts).toEqual(['Home', 'Songs', 'Add Song']);
  });

  it('nav links have correct hrefs', async () => {
    const { $ } = await renderComponent(<Layout>content</Layout>);
    const hrefs = $('nav a')
      .map((_, el) => $(el).attr('href'))
      .get();
    expect(hrefs).toEqual(['/', '/songs', '/songs/new']);
  });

  it('renders children inside <main>', async () => {
    const { $ } = await renderComponent(
      <Layout>
        <p>hello world</p>
      </Layout>,
    );
    expect($('main p').text()).toBe('hello world');
  });

  it('nav separators have nav-sep class', async () => {
    const { $ } = await renderComponent(<Layout>content</Layout>);
    const seps = $('.nav-sep');
    expect(seps.length).toBe(2);
    seps.each((_, el) => {
      expect($(el).text().trim()).toBe('|');
    });
  });
});
