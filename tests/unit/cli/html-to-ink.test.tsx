// @vitest-environment node
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { htmlToInk, extractLinks, extractInteractiveItems } from '@cli/html-to-ink';

describe('htmlToInk', () => {
  it('converts headings to bold text', () => {
    const element = htmlToInk('<h1>Hello World</h1>');
    const { lastFrame } = render(element);
    expect(lastFrame()).toContain('Hello World');
  });

  it('converts list items to bullet points', () => {
    const element = htmlToInk('<ul><li>First</li><li>Second</li></ul>');
    const { lastFrame } = render(element);
    const output = lastFrame()!;
    expect(output).toContain('- First');
    expect(output).toContain('- Second');
  });

  it('converts definition lists', () => {
    const element = htmlToInk('<dl><dt>Artist</dt><dd>Queen</dd></dl>');
    const { lastFrame } = render(element);
    const output = lastFrame()!;
    expect(output).toContain('Artist');
    expect(output).toContain('Queen');
  });

  it('converts links to text with URL', () => {
    const element = htmlToInk('<a href="/songs">Browse songs</a>');
    const { lastFrame } = render(element);
    const output = lastFrame()!;
    expect(output).toContain('Browse songs');
    expect(output).toContain('/songs');
  });

  it('strips nav elements', () => {
    const element = htmlToInk('<div><nav><a href="/">Home</a></nav><p>Content</p></div>');
    const { lastFrame } = render(element);
    const output = lastFrame()!;
    expect(output).not.toContain('Home');
    expect(output).toContain('Content');
  });

  it('strips form elements', () => {
    const element = htmlToInk('<div><form><input name="title" /><button>Submit</button></form><p>Other</p></div>');
    const { lastFrame } = render(element);
    const output = lastFrame()!;
    expect(output).not.toContain('Submit');
    expect(output).toContain('Other');
  });

  it('handles nested elements', () => {
    const element = htmlToInk('<div><h1>Title</h1><ul><li><a href="/x">Link</a></li></ul></div>');
    const { lastFrame } = render(element);
    const output = lastFrame()!;
    expect(output).toContain('Title');
    expect(output).toContain('Link');
    expect(output).toContain('/x');
  });

  it('handles HTML entities', () => {
    const element = htmlToInk('<p>Rock &amp; Roll</p>');
    const { lastFrame } = render(element);
    expect(lastFrame()).toContain('Rock & Roll');
  });

  describe('interactive mode', () => {
    it('includes nav content when interactive', () => {
      const html = '<div><nav><a href="/">Home</a></nav><p>Content</p></div>';
      const element = htmlToInk(html, { interactive: true, selectedItemIndex: 0 });
      const { lastFrame } = render(element);
      const output = lastFrame()!;
      expect(output).toContain('Home');
      expect(output).toContain('Content');
    });

    it('renders nav horizontally', () => {
      const html = '<nav><a href="/">Home</a> | <a href="/songs">Songs</a> | <a href="/songs/new">Add Song</a></nav>';
      const element = htmlToInk(html, { interactive: true, selectedItemIndex: -1 });
      const { lastFrame } = render(element);
      const output = lastFrame()!;
      // All nav items should appear on the same line
      const lines = output.split('\n');
      const navLine = lines.find(l => l.includes('Home'));
      expect(navLine).toContain('Songs');
      expect(navLine).toContain('Add Song');
    });

    it('renders all links in interactive mode', () => {
      const html = '<a href="/a">First</a><a href="/b">Second</a>';
      const element = htmlToInk(html, { interactive: true, selectedItemIndex: 0 });
      const { lastFrame } = render(element);
      const output = lastFrame()!;
      // Both links should be rendered
      expect(output).toContain('First');
      expect(output).toContain('Second');
      // Neither should show href in parentheses (interactive style)
      expect(output).not.toContain('(/a)');
      expect(output).not.toContain('(/b)');
    });

    it('does not show href in parentheses for interactive links', () => {
      const html = '<a href="/songs">Browse</a>';
      const element = htmlToInk(html, { interactive: true, selectedItemIndex: 0 });
      const { lastFrame } = render(element);
      const output = lastFrame()!;
      expect(output).toContain('Browse');
      expect(output).not.toContain('(/songs)');
    });

    it('non-interactive mode is backward compatible', () => {
      const html = '<a href="/songs">Browse</a>';
      const element = htmlToInk(html);
      const { lastFrame } = render(element);
      const output = lastFrame()!;
      expect(output).toContain('Browse');
      expect(output).toContain('/songs');
    });

    it('supports deprecated selectedLinkIndex option', () => {
      const html = '<a href="/a">First</a><a href="/b">Second</a>';
      const element = htmlToInk(html, { interactive: true, selectedLinkIndex: 1 });
      const { lastFrame } = render(element);
      const output = lastFrame()!;
      expect(output).toContain('First');
      expect(output).toContain('Second');
    });

    it('renders form fields in interactive mode', () => {
      const html = [
        '<form action="/songs" method="POST">',
        '<label for="title">Title *</label>',
        '<input type="text" id="title" name="title" required />',
        '<label for="artist">Artist *</label>',
        '<input type="text" id="artist" name="artist" required />',
        '<button type="submit">Create Song</button>',
        '</form>',
      ].join('');
      const element = htmlToInk(html, { interactive: true, selectedItemIndex: 0, fieldValues: { title: 'Test' } });
      const { lastFrame } = render(element);
      const output = lastFrame()!;
      expect(output).toContain('Title');
      expect(output).toContain('Test');
      expect(output).toContain('Artist');
      expect(output).toContain('Create Song');
    });

    it('renders form error messages', () => {
      const html = '<form action="/songs" method="POST"><p role="alert">Title is required</p><input name="title" /></form>';
      const element = htmlToInk(html, { interactive: true, selectedItemIndex: 0 });
      const { lastFrame } = render(element);
      const output = lastFrame()!;
      expect(output).toContain('Title is required');
    });
  });
});

describe('extractLinks', () => {
  it('extracts links from HTML', () => {
    const html = '<a href="/songs">Songs</a><a href="/about">About</a>';
    const links = extractLinks(html);
    expect(links).toEqual([
      { href: '/songs', text: 'Songs' },
      { href: '/about', text: 'About' },
    ]);
  });

  it('returns empty array for no links', () => {
    const links = extractLinks('<p>No links here</p>');
    expect(links).toEqual([]);
  });

  it('extracts links from nested elements', () => {
    const html = '<nav><a href="/">Home</a></nav><ul><li><a href="/songs">Songs</a></li></ul>';
    const links = extractLinks(html);
    expect(links).toEqual([
      { href: '/', text: 'Home' },
      { href: '/songs', text: 'Songs' },
    ]);
  });

  it('handles links with no href', () => {
    const links = extractLinks('<a>No href</a>');
    expect(links).toEqual([{ href: '', text: 'No href' }]);
  });
});

describe('extractInteractiveItems', () => {
  it('extracts links in document order', () => {
    const html = '<a href="/">Home</a><a href="/songs">Songs</a>';
    const items = extractInteractiveItems(html);
    expect(items).toEqual([
      { type: 'link', href: '/', text: 'Home' },
      { type: 'link', href: '/songs', text: 'Songs' },
    ]);
  });

  it('extracts form fields and submit button', () => {
    const html = [
      '<form action="/songs" method="POST">',
      '<label for="title">Title *</label>',
      '<input type="text" id="title" name="title" required />',
      '<label for="artist">Artist *</label>',
      '<input type="text" id="artist" name="artist" required />',
      '<button type="submit">Create Song</button>',
      '</form>',
    ].join('');
    const items = extractInteractiveItems(html);
    expect(items).toEqual([
      { type: 'field', name: 'title', label: 'Title', required: true },
      { type: 'field', name: 'artist', label: 'Artist', required: true },
      { type: 'submit', action: '/songs', method: 'POST' },
    ]);
  });

  it('extracts links and form items in document order', () => {
    const html = [
      '<nav><a href="/">Home</a><a href="/songs">Songs</a></nav>',
      '<form action="/songs" method="POST">',
      '<label for="title">Title *</label>',
      '<input type="text" id="title" name="title" required />',
      '<button type="submit">Create</button>',
      '</form>',
    ].join('');
    const items = extractInteractiveItems(html);
    expect(items).toEqual([
      { type: 'link', href: '/', text: 'Home' },
      { type: 'link', href: '/songs', text: 'Songs' },
      { type: 'field', name: 'title', label: 'Title', required: true },
      { type: 'submit', action: '/songs', method: 'POST' },
    ]);
  });

  it('returns empty array when no interactive elements', () => {
    const items = extractInteractiveItems('<p>Just text</p>');
    expect(items).toEqual([]);
  });

  it('handles optional fields (no required attribute)', () => {
    const html = '<form action="/test" method="POST"><label for="album">Album</label><input type="text" id="album" name="album" /><button type="submit">Save</button></form>';
    const items = extractInteractiveItems(html);
    expect(items).toContainEqual({ type: 'field', name: 'album', label: 'Album', required: false });
  });
});
