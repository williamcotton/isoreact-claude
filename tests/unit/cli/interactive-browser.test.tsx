// @vitest-environment node

// ink-testing-library's Stdin mock is missing ref/unref/read methods
// that ink's App component needs for useInput. The App listens for
// 'readable' events and calls stdin.read() to consume data.
// We patch EventEmitter.prototype before any ink import.
import { EventEmitter } from 'node:events';
const proto = EventEmitter.prototype as any;
if (!proto.ref) proto.ref = function () {};
if (!proto.unref) proto.unref = function () {};

import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render as inkRender } from 'ink-testing-library';
import { InteractiveBrowser } from '@cli/InteractiveBrowser';
import type { CliApp } from '@cli/cli-app';

// Wrap ink-testing-library's render to patch stdin for readable stream support.
// ink's App uses stdin.read() via 'readable' events, but the test library
// only emits 'data' events. We intercept writes to provide readable semantics.
function render(element: React.ReactElement) {
  const instance = inkRender(element);
  const stdin = instance.stdin as any;

  const buffer: string[] = [];
  stdin.read = function () {
    return buffer.shift() ?? null;
  };

  const originalWrite = stdin.write.bind(stdin);
  stdin.write = function (data: string) {
    buffer.push(data);
    stdin.emit('readable');
    originalWrite(data);
  };

  return instance;
}

function createMockApp(pages: Record<string, { html: string; statusCode?: number }>): CliApp {
  return {
    get: vi.fn(),
    post: vi.fn(),
    exec: vi.fn(async (path: string) => {
      const page = pages[path] ?? { html: '<h1>Not Found</h1>', statusCode: 404 };
      return {
        html: page.html,
        statusCode: page.statusCode ?? 200,
        redirectUrl: null,
      };
    }),
  };
}

const SONGS_HTML = [
  '<div>',
  '<nav><a href="/">Home</a> | <a href="/songs">Songs</a> | <a href="/songs/new">Add Song</a></nav>',
  '<h1>Songs</h1>',
  '<ul>',
  '<li><a href="/songs/1">Bohemian Rhapsody</a></li>',
  '<li><a href="/songs/2">Stairway to Heaven</a></li>',
  '</ul>',
  '</div>',
].join('');

const DETAIL_HTML = [
  '<div>',
  '<nav><a href="/">Home</a> | <a href="/songs">Songs</a></nav>',
  '<h1>Bohemian Rhapsody</h1>',
  '<dl><dt>Artist</dt><dd>Queen</dd></dl>',
  '</div>',
].join('');

const FORM_HTML = [
  '<div>',
  '<nav><a href="/">Home</a> | <a href="/songs">Songs</a></nav>',
  '<h1>Add Song</h1>',
  '<form action="/songs" method="POST">',
  '<label for="title">Title *</label>',
  '<input type="text" id="title" name="title" required />',
  '<label for="artist">Artist *</label>',
  '<input type="text" id="artist" name="artist" required />',
  '<label for="album">Album</label>',
  '<input type="text" id="album" name="album" />',
  '<button type="submit">Create Song</button>',
  '</form>',
  '</div>',
].join('');

const NO_LINKS_HTML = '<div><h1>Welcome</h1><p>No links here</p></div>';

function delay(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('InteractiveBrowser', () => {
  it('shows loading state then page content', async () => {
    const app = createMockApp({ '/songs': { html: SONGS_HTML } });
    const { lastFrame } = render(<InteractiveBrowser app={app} initialPath="/songs" />);

    expect(lastFrame()).toContain('Loading');

    await delay();

    const output = lastFrame()!;
    expect(output).toContain('Songs');
    expect(output).toContain('Bohemian Rhapsody');
  });

  it('shows URL bar with path and status code', async () => {
    const app = createMockApp({ '/songs': { html: SONGS_HTML } });
    const { lastFrame } = render(<InteractiveBrowser app={app} initialPath="/songs" />);

    await delay();

    const output = lastFrame()!;
    expect(output).toContain('/songs');
    expect(output).toContain('200');
  });

  it('shows status bar with selected link info', async () => {
    const app = createMockApp({ '/songs': { html: SONGS_HTML } });
    const { lastFrame } = render(<InteractiveBrowser app={app} initialPath="/songs" />);

    await delay();

    const output = lastFrame()!;
    expect(output).toContain('▸');
    expect(output).toContain('q: quit');
  });

  it('navigates links with j/k keys', async () => {
    const app = createMockApp({ '/songs': { html: SONGS_HTML } });
    const { lastFrame, stdin } = render(<InteractiveBrowser app={app} initialPath="/songs" />);

    await delay();

    let output = lastFrame()!;
    expect(output).toContain('1/5');

    stdin.write('j');
    await delay();

    output = lastFrame()!;
    expect(output).toContain('2/5');

    stdin.write('k');
    await delay();

    output = lastFrame()!;
    expect(output).toContain('1/5');
  });

  it('wraps around when navigating past last link', async () => {
    const app = createMockApp({ '/songs': { html: SONGS_HTML } });
    const { lastFrame, stdin } = render(<InteractiveBrowser app={app} initialPath="/songs" />);

    await delay();

    stdin.write('k');
    await delay();

    const output = lastFrame()!;
    expect(output).toContain('5/5');
  });

  it('navigates forward with down arrow', async () => {
    const app = createMockApp({ '/songs': { html: SONGS_HTML } });
    const { lastFrame, stdin } = render(<InteractiveBrowser app={app} initialPath="/songs" />);

    await delay();

    // Down arrow: ESC [ B
    stdin.write('\x1B[B');
    await delay();

    const output = lastFrame()!;
    expect(output).toContain('2/5');
  });

  it('navigates forward with right arrow', async () => {
    const app = createMockApp({ '/songs': { html: SONGS_HTML } });
    const { lastFrame, stdin } = render(<InteractiveBrowser app={app} initialPath="/songs" />);

    await delay();

    // Right arrow: ESC [ C
    stdin.write('\x1B[C');
    await delay();

    const output = lastFrame()!;
    expect(output).toContain('2/5');
  });

  it('navigates backward with left arrow', async () => {
    const app = createMockApp({ '/songs': { html: SONGS_HTML } });
    const { lastFrame, stdin } = render(<InteractiveBrowser app={app} initialPath="/songs" />);

    await delay();

    // Move forward first
    stdin.write('j');
    await delay();
    expect(lastFrame()!).toContain('2/5');

    // Left arrow: ESC [ D
    stdin.write('\x1B[D');
    await delay();

    const output = lastFrame()!;
    expect(output).toContain('1/5');
  });

  it('follows link on Enter', async () => {
    const app = createMockApp({
      '/songs': { html: SONGS_HTML },
      '/': { html: '<div><h1>Home</h1><a href="/songs">Songs</a></div>' },
    });
    const { lastFrame, stdin } = render(<InteractiveBrowser app={app} initialPath="/songs" />);

    await delay();

    stdin.write('\r');
    await delay(100);

    const output = lastFrame()!;
    expect(output).toContain('Home');
    expect(output).toContain('200');
  });

  it('handles page with no links', async () => {
    const app = createMockApp({ '/welcome': { html: NO_LINKS_HTML } });
    const { lastFrame } = render(<InteractiveBrowser app={app} initialPath="/welcome" />);

    await delay();

    const output = lastFrame()!;
    expect(output).toContain('Welcome');
    expect(output).toContain('No interactive items');
  });

  it('exits on q key', async () => {
    const app = createMockApp({ '/songs': { html: SONGS_HTML } });
    const { lastFrame, stdin } = render(<InteractiveBrowser app={app} initialPath="/songs" />);

    await delay();

    stdin.write('q');
    await delay();

    expect(lastFrame()).toBeDefined();
  });

  it('resets selected index after navigation', async () => {
    const app = createMockApp({
      '/songs': { html: SONGS_HTML },
      '/songs/1': { html: DETAIL_HTML },
    });
    const { lastFrame, stdin } = render(<InteractiveBrowser app={app} initialPath="/songs" />);

    await delay();

    stdin.write('j');
    await delay();
    expect(lastFrame()!).toContain('2/5');

    // Navigate to 4th item (first song link) — need j,j,j from index 1
    stdin.write('j');
    await delay();
    stdin.write('j');
    await delay();

    stdin.write('\r');
    await delay(100);

    const output = lastFrame()!;
    expect(output).toContain('Bohemian Rhapsody');
    expect(output).toContain('1/');
  });

  describe('form interaction', () => {
    it('renders form fields as interactive items', async () => {
      const app = createMockApp({ '/songs/new': { html: FORM_HTML } });
      const { lastFrame } = render(<InteractiveBrowser app={app} initialPath="/songs/new" />);

      await delay();

      const output = lastFrame()!;
      expect(output).toContain('Title');
      expect(output).toContain('Artist');
      expect(output).toContain('Album');
      expect(output).toContain('Create Song');
    });

    it('shows Enter: edit hint when a field is selected', async () => {
      const app = createMockApp({ '/songs/new': { html: FORM_HTML } });
      const { lastFrame, stdin } = render(<InteractiveBrowser app={app} initialPath="/songs/new" />);

      await delay();

      // Navigate past nav links (Home, Songs) to first field (Title)
      stdin.write('j');
      await delay();
      stdin.write('j');
      await delay();

      const output = lastFrame()!;
      expect(output).toContain('Enter: edit');
    });

    it('enters edit mode on Enter and shows editing status', async () => {
      const app = createMockApp({ '/songs/new': { html: FORM_HTML } });
      const { lastFrame, stdin } = render(<InteractiveBrowser app={app} initialPath="/songs/new" />);

      await delay();

      // Navigate to first field (index 2: Home=0, Songs=1, title=2)
      stdin.write('j');
      await delay();
      stdin.write('j');
      await delay();

      // Enter edit mode
      stdin.write('\r');
      await delay();

      const output = lastFrame()!;
      expect(output).toContain('Editing: title');
      expect(output).toContain('Enter: done');
    });

    it('typing in edit mode adds characters to field', async () => {
      const app = createMockApp({ '/songs/new': { html: FORM_HTML } });
      const { lastFrame, stdin } = render(<InteractiveBrowser app={app} initialPath="/songs/new" />);

      await delay();

      // Navigate to title field
      stdin.write('j');
      await delay();
      stdin.write('j');
      await delay();

      // Enter edit mode
      stdin.write('\r');
      await delay();

      // Type a character
      stdin.write('H');
      await delay();
      stdin.write('i');
      await delay();

      const output = lastFrame()!;
      expect(output).toContain('[Hi]');
    });

    it('Enter in edit mode returns to browse mode', async () => {
      const app = createMockApp({ '/songs/new': { html: FORM_HTML } });
      const { lastFrame, stdin } = render(<InteractiveBrowser app={app} initialPath="/songs/new" />);

      await delay();

      // Navigate to title field
      stdin.write('j');
      await delay();
      stdin.write('j');
      await delay();

      // Enter edit mode
      stdin.write('\r');
      await delay();
      expect(lastFrame()!).toContain('Editing:');

      // Exit edit mode with Enter
      stdin.write('\r');
      await delay();

      const output = lastFrame()!;
      expect(output).toContain('Enter: edit');
      expect(output).not.toContain('Editing:');
    });

    it('Escape in edit mode returns to browse mode', async () => {
      const app = createMockApp({ '/songs/new': { html: FORM_HTML } });
      const { lastFrame, stdin } = render(<InteractiveBrowser app={app} initialPath="/songs/new" />);

      await delay();

      // Navigate to title field
      stdin.write('j');
      await delay();
      stdin.write('j');
      await delay();

      // Enter edit mode
      stdin.write('\r');
      await delay();
      expect(lastFrame()!).toContain('Editing:');

      // Exit with Escape
      stdin.write('\x1B');
      await delay();

      const output = lastFrame()!;
      expect(output).not.toContain('Editing:');
    });

    it('shows Enter:submit when submit button is selected', async () => {
      const app = createMockApp({ '/songs/new': { html: FORM_HTML } });
      const { lastFrame, stdin } = render(<InteractiveBrowser app={app} initialPath="/songs/new" />);

      await delay();

      // Navigate to submit button (Home=0, Songs=1, title=2, artist=3, album=4, submit=5)
      for (let i = 0; i < 5; i++) {
        stdin.write('j');
        await delay();
      }

      const output = lastFrame()!;
      expect(output).toContain('Enter: submit');
    });

    it('submitting form calls exec with POST and field values', async () => {
      const app = createMockApp({
        '/songs/new': { html: FORM_HTML },
        '/songs': { html: SONGS_HTML },
      });
      const { lastFrame, stdin } = render(<InteractiveBrowser app={app} initialPath="/songs/new" />);

      await delay();

      // Navigate to title field and type
      stdin.write('j');
      await delay();
      stdin.write('j');
      await delay();
      stdin.write('\r'); // enter edit
      await delay();
      stdin.write('Test Song');
      await delay();
      stdin.write('\r'); // exit edit
      await delay();

      // Navigate to artist field and type
      stdin.write('j');
      await delay();
      stdin.write('\r'); // enter edit
      await delay();
      stdin.write('Test Artist');
      await delay();
      stdin.write('\r'); // exit edit
      await delay();

      // Navigate to submit (skip album field)
      stdin.write('j');
      await delay();
      stdin.write('j');
      await delay();

      // Submit
      stdin.write('\r');
      await delay(100);

      // Verify exec was called with POST
      expect(app.exec).toHaveBeenCalledWith(
        '/songs',
        'POST',
        expect.stringContaining('title=Test')
      );
    });

    it('form error re-renders with error message', async () => {
      const errorHtml = [
        '<div>',
        '<h1>Add Song</h1>',
        '<form action="/songs" method="POST">',
        '<p role="alert">Title is required</p>',
        '<label for="title">Title *</label>',
        '<input type="text" id="title" name="title" required />',
        '<button type="submit">Create Song</button>',
        '</form>',
        '</div>',
      ].join('');
      const app = createMockApp({ '/songs/new': { html: errorHtml } });
      const { lastFrame } = render(<InteractiveBrowser app={app} initialPath="/songs/new" />);

      await delay();

      const output = lastFrame()!;
      expect(output).toContain('Title is required');
    });
  });
});
