import express from 'express';
import compression from 'compression';
import path from 'path';
import { AsyncLocalStorage } from 'async_hooks';
import { createSchema } from '@shared/graphql/schema';
import { openDatabase, createSqliteDataStore, createServerExecutor, createGraphQLEndpoint, createSqliteCachedExecutor, createSqliteHtmlCache, withMutationNotify } from './graphql';
import { createServerApp } from './create-server-app';
import { createBuilderApp } from '@builder/builder-app';
import { registerRoutes } from '@shared/universal-app';
import { createAssetResolver } from './assets';

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV === 'development';

// Middleware
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
const clientDir = path.resolve(__dirname, '../client');
if (isDev) {
  app.use('/static', express.static(clientDir, { maxAge: 0 }));
} else {
  app.use('/static', express.static(clientDir, { maxAge: '1y', immutable: true }));
}

// Asset resolution
const getAssets = createAssetResolver(isDev, clientDir);

// SQLite database
const db = openDatabase();

// 1. Cache storage
const htmlCache = createSqliteHtmlCache(db);

// 2. Composition
const routeContext = new AsyncLocalStorage<string>();
const rawDataStore = createSqliteDataStore(db);
const notifyingStore = withMutationNotify(rawDataStore, (paths) => {
  paths.forEach((p) => {
    invalidateRoute(p);
    routeContext.run(p, () => builderApp.build(p));
  });
});
const schema = createSchema(notifyingStore);
const baseExecutor = createServerExecutor(schema);
const { executor: cachedExecutor, invalidateRoute } = createSqliteCachedExecutor(
  baseExecutor,
  routeContext,
  db,
);

// 3. Builder
const builderApp = createBuilderApp(
  cachedExecutor,
  getAssets,
  (p, html) => htmlCache.set(p, html),
  (p) => htmlCache.delete(p),
);
registerRoutes(builderApp);

// GraphQL HTTP endpoint
app.post('/graphql', createGraphQLEndpoint(schema));

// 4. Cache middleware (before universal routes)
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  const cached = htmlCache.get(req.path);
  if (cached) {
    res.send(cached);
    return;
  }
  next();
});

// Route context middleware (tracks which route is being rendered)
app.use((req, _res, next) => {
  routeContext.run(req.path, next);
});

// Universal routes (fallback when cache misses)
const universalApp = createServerApp(app, cachedExecutor, getAssets);
registerRoutes(universalApp);

// Graceful shutdown
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    db.close();
    process.exit(0);
  });
}

// 5. Pre-warm on startup
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  Promise.all(
    ['/', '/songs', '/songs/new'].map((p) =>
      routeContext.run(p, () => builderApp.build(p))
    )
  ).then(() => {
    console.log(`Builder pre-warmed ${htmlCache.size} pages`);
  });
});
