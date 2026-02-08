# IsoReact

A micro-framework for building universal React applications where routes, data fetching, and rendering logic are written once and run identically on both the server and the browser.

IsoReact replaces the typical "pick a meta-framework" decision with a small, transparent architecture you can read end-to-end in an afternoon. There's no magic — just a shared interface (`UniversalApp`) that Express implements on the server and a lightweight shim implements in the browser.

```
npm install && npm run build && npm start
# → http://localhost:3000
```

---

## How It Works

### The Core Idea

You define routes using an Express-like API. The same code runs on the server (for SSR) and in the browser (for client-side navigation):

```tsx
// src/shared/universal-app.tsx

export function registerRoutes(app: UniversalApp) {
  app.get('/songs', async (req, res) => {
    const result = await req.graphql<{ songs: Song[] }>(SONGS_QUERY);
    const songs = result.data?.songs ?? [];
    const { SongList } = await import('@components/pages/SongList');
    res.renderApp(<SongList initialData={songs} />);
  });
}
```

On the **server**, `req.graphql()` executes the query directly against the GraphQL schema (no HTTP round-trip), and `res.renderApp()` calls `renderToString()` and sends full HTML.

In the **browser**, `req.graphql()` makes a `fetch()` to `/graphql`, and `res.renderApp()` calls React's `root.render()` to update the DOM.

The route handler doesn't know or care which environment it's in.

### The Interface

The entire contract between your routes and the runtime fits in a few types:

```typescript
interface UniversalApp {
  get(path: string, handler: RouteHandler): void;
  post(path: string, handler: RouteHandler): void;
}

interface UniversalRequest {
  path: string;
  method: string;
  params: Record<string, string>;   // :id, :slug, etc.
  query: Record<string, string>;    // ?foo=bar
  body?: any;                       // POST body
  graphql: GraphQLExecutor;         // data fetching
}

interface UniversalResponse {
  renderApp(element: ReactElement): void;
  setStatus(code: number): void;
  redirect(url: string): void;
}

type RouteHandler = (req: UniversalRequest, res: UniversalResponse) => Promise<void> | void;
```

Two implementations of this interface exist:

| | Server | Browser |
|---|---|---|
| **App** | Wraps Express (`create-server-app.ts`) | Custom shim (`browser-app.ts`) |
| **Request** | Built from Express `req` | Built from `window.location` |
| **Response** | `renderToString()` → HTML | `root.render()` → DOM |
| **GraphQL** | Direct `graphql()` execution | `fetch('/graphql')` |

---

## Architecture

```
src/
├── shared/                    # Runs on BOTH server and client
│   ├── types/                 # UniversalApp, UniversalRequest, UniversalResponse
│   ├── graphql/               # Schema, query strings, Song type
│   ├── utils/                 # URL parsing
│   └── universal-app.tsx      # Route definitions (the important file)
│
├── server/                    # Node.js only
│   ├── index.ts               # Express entry point
│   ├── create-server-app.ts   # Adapts Express → UniversalApp
│   └── graphql/               # In-memory data store, direct executor, HTTP endpoint
│
├── client/                    # Browser only
│   ├── index.tsx              # Entry point: create app, register routes, hydrate
│   ├── browser-express/       # Express-like API for the browser
│   │   ├── browser-app.ts     # UniversalApp implementation
│   │   ├── router.ts          # path-to-regexp route matching
│   │   ├── browser-request.ts # Builds UniversalRequest from browser state
│   │   ├── browser-response.ts# renderApp() via React DOM
│   │   └── interceptor.ts     # Captures link clicks, form submits, popstate
│   └── graphql/               # fetch()-based executor with SSR cache
│
└── components/                # React components (shared)
    ├── Layout.tsx
    └── pages/
        ├── Home.tsx
        ├── SongList.tsx
        ├── SongDetail.tsx
        └── CreateSong.tsx
```

---

## Data Flow

### 1. Server-Side Render (first page load)

```
Browser requests GET /songs
        ↓
Express matches route → runs handler from universal-app.tsx
        ↓
req.graphql(SONGS_QUERY) → direct graphql() call (no HTTP)
        ↓
res.renderApp(<SongList />) → renderToString() → HTML
        ↓
Server injects GraphQL results into window.__INITIAL_DATA__
        ↓
Browser receives full HTML + data + JS bundles
```

### 2. Hydration (JS loads)

```
Client entry runs registerRoutes(app) → app.start()
        ↓
Matches current URL to route → runs same handler
        ↓
req.graphql(SONGS_QUERY) → cache hit from __INITIAL_DATA__ (no fetch)
        ↓
res.renderApp(<SongList />) → hydrateRoot() attaches to existing HTML
        ↓
Interceptor activates — future navigations are client-side
```

### 3. Client Navigation (link click)

```
User clicks <a href="/songs/3">
        ↓
Interceptor prevents default, calls history.pushState()
        ↓
Router matches /songs/:id → runs handler
        ↓
req.graphql(SONG_QUERY, { id: '3' }) → fetch('/graphql') → server
        ↓
res.renderApp(<SongDetail />) → root.render() → DOM update
```

### 4. Form Submission

```
User submits <form action="/songs" method="POST">
        ↓
Interceptor prevents default, reads FormData
        ↓
Router matches POST /songs → runs handler with req.body
        ↓
Handler validates → req.graphql(CREATE_SONG_MUTATION)
        ↓
res.redirect('/songs') → pushState + re-navigate
```

---

## Writing Routes

### Basic page

```tsx
app.get('/about', async (_req, res) => {
  const { About } = await import('@components/pages/About');
  res.renderApp(<About />);
});
```

### Fetching data

```tsx
app.get('/songs', async (req, res) => {
  const result = await req.graphql<{ songs: Song[] }>(SONGS_QUERY);
  const songs = result.data?.songs ?? [];
  const { SongList } = await import('@components/pages/SongList');
  res.renderApp(<SongList initialData={songs} />);
});
```

### URL parameters

```tsx
app.get('/songs/:id', async (req, res) => {
  const result = await req.graphql<{ song: Song | null }>(SONG_QUERY, {
    id: req.params.id,
  });
  const song = result.data?.song ?? null;
  if (!song) {
    res.setStatus(404);
  }
  const { SongDetail } = await import('@components/pages/SongDetail');
  res.renderApp(<SongDetail song={song} />);
});
```

### Handling POST requests

```tsx
app.post('/songs', async (req, res) => {
  const { title, artist } = req.body ?? {};

  if (!title || !artist) {
    res.setStatus(400);
    const { CreateSong } = await import('@components/pages/CreateSong');
    res.renderApp(<CreateSong errorMessage="Title and artist are required." />);
    return;
  }

  await req.graphql(CREATE_SONG_MUTATION, {
    input: { title, artist },
  });

  res.redirect('/songs');
});
```

### Redirects

```tsx
app.get('/old-path', async (_req, res) => {
  res.redirect('/new-path');
});
```

On the server, this sends an HTTP 302. In the browser, it calls `history.pushState()` and re-navigates.

---

## Code Splitting

Dynamic `import()` in route handlers creates automatic code-split points:

```tsx
app.get('/songs', async (req, res) => {
  // This import creates a separate chunk loaded on demand
  const { SongList } = await import('@components/pages/SongList');
  res.renderApp(<SongList initialData={songs} />);
});
```

The initial HTML only includes `vendors.*.js` and `main.*.js`. Page-specific code loads when a route is first visited.

---

## GraphQL

### Shared schema

The GraphQL schema is defined once in `src/shared/graphql/schema.ts` using `graphql-js` and is shared between server and client builds. Query and mutation strings live in `src/shared/graphql/operations.ts`.

### How execution differs by environment

```
┌─────────────────────────────────────────────────────────────┐
│  req.graphql(query, variables)                              │
│                                                             │
│  Server:   graphql(schema, query, variables)   ← direct     │
│  Browser:  fetch('/graphql', { body: ... })    ← HTTP POST  │
│  Hydrate:  window.__INITIAL_DATA__.graphql[key]← cache hit  │
└─────────────────────────────────────────────────────────────┘
```

The server executor (`src/server/graphql/executor.ts`) calls `graphql()` directly against the in-process schema — no network involved.

The client executor (`src/client/graphql/executor.ts`) first checks the SSR cache (results the server injected into `window.__INITIAL_DATA__`), then falls back to a `fetch()` call. Cache entries are consumed once to avoid stale data on re-navigation.

### SSR cache

During SSR, every `req.graphql()` call records its result keyed by `JSON.stringify({ query, variables })`. The collected results are serialized into the HTML:

```html
<script>window.__INITIAL_DATA__ = {"graphql":{...}};</script>
```

When the client hydrates, it reads from this cache instead of re-fetching. This is why hydration produces no network requests.

### HTTP endpoint

The server also exposes `POST /graphql` for the client to use after hydration:

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ songs { id title artist } }"}'
```

---

## The Browser-Express Shim

The `src/client/browser-express/` directory implements the Express-like API that runs in the browser. It has four parts:

### Router (`router.ts`)
Uses `path-to-regexp` to match URLs against registered routes, extracting params like `:id`. Same library Express uses internally.

### Interceptor (`interceptor.ts`)
Attaches global event listeners to capture:
- **Link clicks** — same-origin `<a>` tags trigger client-side navigation instead of full page loads. Modifier keys (Ctrl, Cmd, Shift), external links, downloads, and hash-only links are left alone.
- **Form submissions** — `<form>` elements with `GET` or `POST` methods are intercepted. FormData is extracted and passed as `req.body`.
- **Popstate** — browser back/forward buttons trigger re-navigation through the router.

### Request (`browser-request.ts`)
Constructs a `UniversalRequest` from the current `window.location`, parsed query string, matched route params, and the GraphQL executor.

### Response (`browser-response.ts`)
- `renderApp()` calls `root.render()` on the existing React root
- `setStatus()` is a no-op (browsers can't set HTTP status codes)
- `redirect()` calls `history.pushState()` then dispatches a `popstate` event to trigger re-navigation

---

## Progressive Enhancement

The app works without JavaScript:

- Navigation uses real `<a href="...">` links
- Forms use real `<form action="..." method="POST">` attributes
- Nav separators (` | `) are visible in text-mode browsers, hidden via CSS in graphical browsers

You can verify this with `curl` or a text browser like Lynx. The server renders full HTML for every route.

---

## Build

Webpack produces two bundles:

```bash
npm run build:client   # → dist/client/*.js, *.css (browser, ESM, code-split)
npm run build:server   # → dist/server/index.js  (Node.js, CommonJS, externals)
```

The client build uses content hashes for cache-busting and splits vendor dependencies (React, graphql-js) into a separate chunk. The server build excludes `node_modules` via `webpack-node-externals`.

```bash
npm run build          # runs both
npm start              # node dist/server/index.js
```

---

## Extending This Template

### Adding a new route

1. Add your query/mutation to `src/shared/graphql/operations.ts`
2. Create a component in `src/components/pages/`
3. Add a handler in `src/shared/universal-app.tsx`:

```tsx
app.get('/artists/:name', async (req, res) => {
  const result = await req.graphql<{ songsByArtist: Song[] }>(
    SONGS_BY_ARTIST_QUERY,
    { artist: req.params.name }
  );
  const songs = result.data?.songsByArtist ?? [];
  const { ArtistPage } = await import('@components/pages/ArtistPage');
  res.renderApp(<ArtistPage artist={req.params.name} songs={songs} />);
});
```

That's it. The route now works with SSR, hydration, client navigation, and code splitting.

### Swapping the data layer

The `GraphQLExecutor` type is just a function:

```typescript
type GraphQLExecutor = <T = any>(
  query: string,
  variables?: Record<string, any>
) => Promise<GraphQLResult<T>>;
```

You could replace GraphQL with REST, tRPC, or direct database calls — as long as both the server and client executors implement the same interface. The `req.graphql` name is a convention; rename it to `req.fetch` or `req.query` and update the types.

### Adding middleware-like behavior

Since route handlers are just async functions, you can compose them:

```tsx
function withAuth(handler: RouteHandler): RouteHandler {
  return async (req, res) => {
    // On server, check session; on client, check local state
    // ...
    return handler(req, res);
  };
}

app.get('/admin', withAuth(async (req, res) => {
  // ...
}));
```

### Replacing the data store

The demo uses an in-memory array (`src/server/graphql/data-store.ts`). Replace `dataStore` with calls to a real database — the rest of the architecture stays the same since GraphQL resolvers abstract the storage layer.

---

## Testing

```bash
npm test              # single run
npm run test:watch    # watch mode
```

Tests use [Vitest](https://vitest.dev/) with cheerio for HTML assertions.

### Test structure

```
tests/
├── server.test.ts            # Integration: SSR song flow
├── client.test.tsx           # Integration: client hydration song flow
├── drivers/                  # Shared test infrastructure
│   ├── types.ts              # AppDriver interface
│   └── test-executor.ts      # In-memory GraphQL executor
├── specs/
│   └── song-flow.spec.ts     # Shared spec run by both server + client
└── unit/
    ├── components/           # React component tests (jsdom)
    │   ├── render-helper.tsx # createRoot + act → cheerio helper
    │   ├── layout.test.tsx
    │   ├── home.test.tsx
    │   ├── song-list.test.tsx
    │   ├── song-detail.test.tsx
    │   └── create-song.test.tsx
    ├── server/               # Server-side unit tests
    │   ├── create-server-app.test.ts
    │   ├── data-store.test.ts
    │   └── graphql-endpoint.test.ts
    ├── client/               # Client-side unit tests
    │   └── router.test.ts
    └── shared/               # Shared utility tests
        └── url.test.ts
```

### Universal integration tests

The same `song-flow.spec.ts` runs against both environments via the `AppDriver` interface:

- **Server driver** (`server.test.ts`): Uses supertest to make HTTP requests, cheerio to parse HTML responses
- **Client driver** (`client.test.tsx`): Uses jsdom with `createRoot` + `act`, simulates navigation via `pushState`/`popstate`

Both drivers share a `createTestExecutor()` that sets up an in-memory GraphQL executor with seed data.

### Component unit tests

Component tests in `tests/unit/components/` render individual React components in jsdom using a shared `renderComponent()` helper that returns a cheerio instance for querying the rendered HTML.

---

## Scripts

| Command | Description |
|---|---|
| `npm run build` | Build client and server bundles |
| `npm run build:client` | Build browser bundle only |
| `npm run build:server` | Build server bundle only |
| `npm start` | Start the production server |
| `npm run dev` | Start dev server with HMR (React Fast Refresh) |
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |

---

## Development

```bash
npm run dev
```

This starts three processes via `concurrently`:

| Process | What it does |
|---|---|
| `webpack serve` | Serves client bundles on port 3010 with HMR + React Fast Refresh |
| `webpack --watch` | Rebuilds the server bundle on source changes |
| `nodemon` | Restarts the Express server when the server bundle changes |

The Express server (port 3000) references scripts from `localhost:3010` in dev mode, so the browser gets HMR-capable bundles.

**Workflow:**
- Edit a React component → React Fast Refresh patches it in-place (state preserved, no page reload)
- Edit server code → server bundle rebuilds → nodemon restarts → refresh browser manually
- Edit shared code → both rebuild; client gets HMR, server restarts

CSS is inlined into a `<style>` tag in the SSR HTML to prevent a flash of unstyled content. After hydration, `style-loader` takes over so style changes apply instantly via HMR.

---

## Dependencies

**Runtime**: express, react, react-dom, graphql, path-to-regexp, compression

**Build**: webpack, ts-loader, css-loader, mini-css-extract-plugin, typescript

**Dev**: webpack-dev-server, react-refresh, @pmmmwh/react-refresh-webpack-plugin, react-refresh-typescript, concurrently, nodemon

**Test**: vitest, jsdom, cheerio, supertest

No meta-framework. No runtime abstraction layer you can't read. The entire architecture is in the `src/` directory.
