# IsoReact

Universal React application where the same route definitions run on server (Express.js), client (browser-express shim), CLI (Ink terminal UI), and builder (ISR-style cache pre-warming).

## Quick Start

```bash
npm install
npm run build
npm start
# http://localhost:3000
```

## Development (HMR)

```bash
npm run dev
```

Runs three processes via `concurrently`:
- **Port 3010**: `webpack serve` — client HMR with React Fast Refresh (state-preserving)
- **Server rebuild**: `webpack --watch` — rebuilds server bundle on changes
- **Server restart**: `nodemon` — restarts Express when server bundle changes

In dev mode (`NODE_ENV === 'development'`), the server serves HTML pointing to `http://localhost:3010/static/` for scripts. CSS is inlined into a `<style>` tag in the HTML to prevent FOUC; `style-loader` takes over after hydration for HMR.

## CLI

```bash
npm run build:cli
npm run cli -- /songs             # one-shot: render page and exit
npm run cli -- -i /songs          # interactive: keyboard-driven terminal browser
npm run cli -- /songs -d "title=Test&artist=Me"  # POST with body
```

The CLI is a third runtime that reuses the same route definitions. It uses [Ink](https://github.com/vadimdemedes/ink) to render HTML output as styled terminal UI. Two modes:
- **One-shot**: Executes a route, converts HTML to Ink components, prints, and exits. Non-zero exit code on 4xx/5xx.
- **Interactive**: Full terminal browser with keyboard navigation (j/k/arrows), link following (Enter), form field editing, and form submission.

## Testing

```bash
npm test              # single run
npm run test:watch    # watch mode
```

Tests use Vitest with cheerio for HTML assertions. After making changes, run `npm test` to verify.

### Test structure

```
tests/
├── server.test.ts            # Integration: SSR song flow (supertest)
├── client.test.tsx           # Integration: client hydration song flow (jsdom)
├── cli.test.ts               # Integration: CLI song flow (cheerio)
├── builder.test.ts           # Integration: builder song flow (cheerio)
├── drivers/                  # Shared test infrastructure
│   ├── types.ts              # AppDriver interface
│   └── test-executor.ts      # In-memory GraphQL executor for tests
├── specs/
│   └── song-flow.spec.ts     # Shared spec run by server + client + CLI + builder drivers
└── unit/                     # Unit tests, mirroring src/ structure
    ├── components/           # React component tests (jsdom)
    │   ├── render-helper.tsx # createRoot + act → cheerio helper
    │   ├── layout.test.tsx
    │   ├── home.test.tsx
    │   ├── song-list.test.tsx
    │   ├── song-detail.test.tsx
    │   └── create-song.test.tsx
    ├── server/               # Server unit tests
    │   ├── create-server-app.test.ts
    │   ├── data-store.test.ts
    │   ├── graphql-endpoint.test.ts
    │   └── cached-executor.test.ts
    ├── client/               # Client unit tests
    │   └── router.test.ts
    ├── cli/                  # CLI unit tests
    │   ├── cli-app.test.ts
    │   ├── cli-response.test.ts
    │   ├── html-to-ink.test.tsx
    │   └── interactive-browser.test.tsx
    ├── builder/              # Builder unit tests
    │   └── builder-app.test.ts
    └── shared/               # Shared utility tests
        └── url.test.ts
```

### Key patterns

- **Universal integration tests**: `song-flow.spec.ts` defines a shared spec that runs identically against server (via supertest), client (via jsdom + `createRoot`/`act`), CLI (via `createCliApp` + cheerio), and builder (via `createBuilderApp` + cheerio) through the `AppDriver` interface.
- **Component unit tests**: Use `renderComponent()` from `render-helper.tsx` — renders with `createRoot` + `act`, returns a cheerio `$` for querying.
- **Test executor**: `createTestExecutor()` provides an in-memory GraphQL executor with seed data, used by both integration drivers.
- **Environment directives**: `// @vitest-environment jsdom` for browser tests, `// @vitest-environment node` for server tests.

### Manual verification

**Do not run the server via agent.** For end-to-end testing, prompt the user to run `npm start` and verify manually:

1. **GraphQL endpoint**: `curl -X POST http://localhost:3000/graphql -H "Content-Type: application/json" -d '{"query":"{ songs { id title artist } }"}'`
2. **SSR**: Visit `/songs` - page loads with data, view source shows `__INITIAL_DATA__`
3. **Hydration**: Navigate away and back - no network request on first load (uses cache)
4. **Client navigation**: Click song link - fetches via `/graphql` endpoint
5. **Form submission**: Create new song via form - mutation works

## Architecture

### Core Concept

Routes are defined once in `src/shared/universal-app.tsx` using an Express-like API:

```typescript
app.get('/songs', async (req, res) => {
  const result = await req.graphql<{ songs: Song[] }>(SONGS_QUERY);
  const songs = result.data?.songs ?? [];
  res.renderApp(<SongList initialData={songs} />);
});
```

This code runs identically on:
- **Server**: Express.js with `renderToString()` for SSR
- **Client**: Custom browser-express shim with `createRoot().render()`
- **CLI**: Ink terminal UI with `renderToStaticMarkup()` → HTML-to-Ink conversion
- **Builder**: Cache pre-warming with `renderToString()` → stored in memory for instant serving

### Directory Structure

```
src/
├── shared/           # Runs on server, client, and CLI
│   ├── types/        # UniversalApp, UniversalRequest, UniversalResponse, GraphQLExecutor
│   ├── graphql/      # Schema definition and operations
│   │   ├── schema.ts      # GraphQL schema using graphql-js
│   │   ├── operations.ts  # Pre-defined query/mutation strings
│   │   └── index.ts
│   ├── router.ts     # Shared path-to-regexp router (used by client + CLI + builder)
│   ├── utils/        # URL parsing utilities
│   └── universal-app.tsx  # Route definitions
├── server/
│   ├── index.ts      # Express entry point, wires up builder + cache middleware
│   ├── create-server-app.ts  # Adapts Express to UniversalApp interface
│   ├── html-shell.ts # Shared HTML template (used by server + builder)
│   ├── assets.ts     # Asset resolution (dev vs prod)
│   ├── graphql/      # Server GraphQL implementation
│   │   ├── data-store.ts       # In-memory song storage
│   │   ├── executor.ts         # Direct graphql() execution
│   │   ├── cached-executor.ts  # Query-level cache with route dependency tracking
│   │   ├── mutation-notify.ts  # Wraps DataStore to trigger rebuilds on mutations
│   │   ├── endpoint.ts         # POST /graphql handler
│   │   └── index.ts
│   └── middleware/   # GraphQL injection, auth
├── client/
│   ├── index.tsx     # Browser entry point
│   ├── browser-express/  # Express-like API for browser
│   │   ├── browser-app.ts      # Main UniversalApp implementation
│   │   ├── router.ts           # Re-exports shared Router
│   │   ├── browser-request.ts  # Creates UniversalRequest from browser context
│   │   ├── browser-response.ts # renderApp() uses React DOM
│   │   └── interceptor.ts      # Intercepts clicks, forms, popstate
│   └── graphql/      # Client GraphQL implementation
│       ├── executor.ts    # HTTP fetch with SSR cache
│       └── index.ts
├── cli/              # CLI terminal runtime
│   ├── index.tsx              # Entry point: arg parsing, one-shot or interactive mode
│   ├── cli-app.ts             # UniversalApp implementation for CLI
│   ├── cli-request.ts         # Creates UniversalRequest from CLI args
│   ├── cli-response.ts        # renderApp() via renderToStaticMarkup
│   ├── html-to-ink.tsx         # Converts HTML to Ink React components
│   ├── InteractiveBrowser.tsx  # Interactive terminal browser (Ink component)
│   └── ink.d.ts               # Type declarations for ink
├── builder/          # Cache builder (ISR-style pre-warming)
│   ├── builder-app.ts         # UniversalApp implementation for builder
│   ├── builder-response.ts    # renderApp() via renderToString → cached HTML
│   └── index.ts
└── components/       # React components
    ├── Layout.tsx
    └── pages/
```

### Data Flow

1. **Cache Hit**: GET request → cache middleware checks `htmlCache` Map → serves pre-built HTML instantly
2. **SSR (cache miss)**: Server executes GraphQL via cached executor → renders React → injects `window.__INITIAL_DATA__.graphql` → sends HTML
3. **Hydration**: Client reads cached GraphQL results from `__INITIAL_DATA__` → hydrates without re-fetching
4. **Client Navigation**: Interceptor catches clicks → router matches → handler fetches via `POST /graphql` → React renders
5. **CLI**: Executes GraphQL directly → renders React to static HTML → converts HTML to Ink terminal components
6. **Builder**: Pre-warms pages on startup → rebuilds affected pages on mutations via `withMutationNotify`

### GraphQL Pattern

Same `req.graphql(query, variables)` interface, different execution:

| Environment | Execution Method |
|-------------|------------------|
| Server | Cached executor → direct `graphql()` call (query-level cache + route tracking) |
| Browser | HTTP POST to `/graphql` endpoint |
| CLI | Direct `graphql()` call from graphql-js (no HTTP) |
| Builder | Cached executor → direct `graphql()` call (records results for `__INITIAL_DATA__`) |

The `GraphQLExecutor` type is defined in `src/shared/types/graphql.types.ts`.

## Key Implementation Details

### Browser-Express Shim

Custom implementation in `src/client/browser-express/`:
- **Router**: Uses `path-to-regexp` for Express-style route matching
- **Interceptor**: Captures link clicks and form submissions, uses `history.pushState()`
- **Response**: `renderApp()` calls React's `createRoot().render()`

### CLI Runtime

Third `UniversalApp` implementation in `src/cli/`:
- **cli-app.ts**: Registers routes via shared `Router`, executes them with `renderToStaticMarkup`, follows redirects automatically (max 10)
- **html-to-ink.tsx**: Converts HTML output to Ink React components (headings, lists, definition lists, links, forms). Two rendering modes: non-interactive (links show `text (href)`) and interactive (selectable items with highlight)
- **InteractiveBrowser.tsx**: Full-screen Ink component with browse/edit modes, j/k/arrow navigation, Enter to follow links or edit fields, form submission, status bar
- Uses shared `Router` from `src/shared/router.ts` (extracted from browser-express, now shared with client)
- Webpack config: `webpack.cli.js` — bundles all dependencies (including ESM-only ink), uses `null-loader` for CSS

### Builder Runtime (ISR Cache)

Fourth `UniversalApp` implementation in `src/builder/`:
- **builder-app.ts**: Uses shared `Router`, `build(path)` renders GET routes → full HTML page via `renderToString` + `renderHtmlShell`. Follows redirects (max 10). Calls `saveToCache` on 200, `removeFromCache` on 404/unmatched.
- **builder-response.ts**: Like cli-response but uses `renderToString` + captures GraphQL cache for `__INITIAL_DATA__`
- **html-shell.ts**: Extracted from `create-server-app.ts` — shared HTML template function (used by both server and builder)
- **assets.ts**: Extracted asset resolution logic (dev vs prod) into `createAssetResolver()`

### GraphQL Caching

Server-side query caching with automatic invalidation:
- **cached-executor.ts**: Wraps the base GraphQL executor with query-level caching. Uses `AsyncLocalStorage` to track which route is being rendered and records query→route dependencies. Mutations always bypass cache.
- **mutation-notify.ts**: `withMutationNotify()` wraps `DataStore` to detect create/update/delete operations and trigger cache invalidation + page rebuilds.
- **Invalidation flow**: Mutation → `withMutationNotify` fires → `invalidateRoute` clears cached queries for affected paths → builder re-renders those pages → `htmlCache` updated

### Code Splitting

Dynamic imports in route handlers create separate chunks:
```typescript
const { SongList } = await import('@components/pages/SongList');
```

Only `vendors.*.js` and `main.*.js` are included in initial HTML. Page chunks load on-demand.

### Progressive Enhancement

Works without JavaScript (Lynx, curl, etc.):
- Real `<a href>` links
- Real `<form action method="POST">` submissions
- Nav separators (` | `) visible in text browsers, hidden via CSS in graphical browsers

### SSR Cache

Server injects GraphQL results into `window.__INITIAL_DATA__.graphql` keyed by normalized query + variables. Client executor checks this cache first, avoiding duplicate fetches during hydration.

## GraphQL API

Single endpoint for all data operations:
- `POST /graphql`

### Queries
- `songs` - List all songs
- `song(id: String!)` - Get single song
- `songsByArtist(artist: String!)` - Get songs by artist

### Mutations
- `createSong(input: CreateSongInput!)` - Create song
- `updateSong(id: String!, input: UpdateSongInput!)` - Update song
- `deleteSong(id: String!)` - Delete song

## Build

Webpack configs are function exports `(env, argv) =>` supporting both dev and prod modes.

Production build:
- `npm run build:server` → `dist/server/index.js` (CommonJS, node externals)
- `npm run build:client` → `dist/client/*.js` (ESM, splitChunks for vendors)
- `npm run build:cli` → `dist/cli/index.js` (CommonJS, all deps bundled)

Dev mode differences (client):
- `style-loader` instead of `MiniCssExtractPlugin` (CSS via JS for HMR)
- React Fast Refresh via `react-refresh-typescript` transformer (no babel)
- `eval-source-map` devtool, no content hashes
- Absolute `publicPath` (`http://localhost:3010/static/`) so dynamic chunks load from dev server

Dev mode differences (server):
- `optimization.nodeEnv: false` — preserves runtime `process.env.NODE_ENV` check (webpack won't bake it in at compile time)
- `NODE_ENV=development` set by the `dev` script so the server serves dev assets
- CSS inlined as `<style>` tag in SSR HTML to prevent FOUC (style-loader takes over after hydration)

## Performance

- Gzip compression enabled via `compression` middleware
- Vendors bundle includes React and graphql-js
- ISR-style cache: builder pre-warms `/`, `/songs`, `/songs/new` on startup; cache middleware serves pre-built HTML before falling through to SSR
- Server-side GraphQL query caching with automatic invalidation on mutations
