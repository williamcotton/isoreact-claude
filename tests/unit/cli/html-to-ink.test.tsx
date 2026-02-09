// @vitest-environment node
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { htmlToInk } from '@cli/html-to-ink';

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
});
