# IsoReact

Universal React application where the same route definitions run on both server (Express.js) and client (browser-express shim).

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

## Testing

**Do not run the server via agent.** After making changes, prompt the user to run `npm start` and test manually. The user can verify:

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

### Directory Structure

```
src/
├── shared/           # Runs on both server and client
│   ├── types/        # UniversalApp, UniversalRequest, UniversalResponse, GraphQLExecutor
│   ├── graphql/      # Schema definition and operations
│   │   ├── schema.ts      # GraphQL schema using graphql-js
│   │   ├── operations.ts  # Pre-defined query/mutation strings
│   │   └── index.ts
│   ├── utils/        # URL parsing utilities
│   └── universal-app.tsx  # Route definitions
├── server/
│   ├── index.ts      # Express entry point
│   ├── create-server-app.ts  # Adapts Express to UniversalApp interface
│   ├── html-shell.ts # HTML template with __INITIAL_DATA__ injection
│   ├── graphql/      # Server GraphQL implementation
│   │   ├── data-store.ts  # In-memory song storage
│   │   ├── executor.ts    # Direct graphql() execution
│   │   ├── endpoint.ts    # POST /graphql handler
│   │   └── index.ts
│   └── middleware/   # GraphQL injection, auth
├── client/
│   ├── index.tsx     # Browser entry point
│   ├── browser-express/  # Express-like API for browser
│   │   ├── browser-app.ts      # Main UniversalApp implementation
│   │   ├── router.ts           # path-to-regexp route matching
│   │   ├── browser-request.ts  # Creates UniversalRequest from browser context
│   │   ├── browser-response.ts # renderApp() uses React DOM
│   │   └── interceptor.ts      # Intercepts clicks, forms, popstate
│   └── graphql/      # Client GraphQL implementation
│       ├── executor.ts    # HTTP fetch with SSR cache
│       └── index.ts
└── components/       # React components
    ├── Layout.tsx
    └── pages/
```

### Data Flow

1. **SSR**: Server executes GraphQL directly → renders React → injects `window.__INITIAL_DATA__.graphql` → sends HTML
2. **Hydration**: Client reads cached GraphQL results from `__INITIAL_DATA__` → hydrates without re-fetching
3. **Client Navigation**: Interceptor catches clicks → router matches → handler fetches via `POST /graphql` → React renders

### GraphQL Pattern

Same `req.graphql(query, variables)` interface, different execution:

| Environment | Execution Method |
|-------------|------------------|
| Server | Direct `graphql()` call from graphql-js (no HTTP) |
| Browser | HTTP POST to `/graphql` endpoint |

The `GraphQLExecutor` type is defined in `src/shared/types/graphql.types.ts`.

## Key Implementation Details

### Browser-Express Shim

Custom implementation in `src/client/browser-express/`:
- **Router**: Uses `path-to-regexp` for Express-style route matching
- **Interceptor**: Captures link clicks and form submissions, uses `history.pushState()`
- **Response**: `renderApp()` calls React's `createRoot().render()`

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
