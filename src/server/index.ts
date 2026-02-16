import express from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { AsyncLocalStorage } from 'async_hooks';
import { createSchema } from '@shared/graphql/schema';
import type { DataStore } from '@shared/graphql';
import { createDataStore, createServerExecutor, createGraphQLEndpoint, createCachedExecutor } from './graphql';
import { createServerApp } from './create-server-app';
import { createBuilderApp } from '@builder/builder-app';
import { registerRoutes } from '@shared/universal-app';

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

interface BuildAssets {
  js: string[];
  css: string[];
  inlineCss?: string;
}

// In dev mode, read the CSS source so we can inline it into the HTML
// to prevent a flash of unstyled content (style-loader handles HMR after hydration).
const devInlineCss = isDev
  ? (() => {
      try {
        return fs.readFileSync(
          path.resolve(__dirname, '../../src/components/styles.css'),
          'utf-8'
        );
      } catch {
        return '';
      }
    })()
  : '';

function getAssets(): BuildAssets {
  if (isDev) {
    return {
      js: [
        'http://localhost:3010/static/vendors.js',
        'http://localhost:3010/static/main.js',
      ],
      css: [],
      inlineCss: devInlineCss,
    };
  }

  return loadProdAssets();
}

// Build asset manifest once at startup to avoid per-request disk reads.
let _prodAssets: BuildAssets | null = null;
function loadProdAssets(): BuildAssets {
  if (_prodAssets) return _prodAssets;

  let files: string[] = [];
  try {
    files = fs.readdirSync(clientDir);
  } catch (err) {
    console.error(`Failed to read client assets from ${clientDir}:`, err);
    return { js: [], css: [] };
  }

  const js: string[] = [];
  const css: string[] = [];

  // vendors first, then main
  const vendorJs = files.find((f) => f.startsWith('vendors.') && f.endsWith('.js'));
  const mainJs = files.find((f) => f.startsWith('main.') && f.endsWith('.js'));
  const mainCss = files.find((f) => f.startsWith('main.') && f.endsWith('.css'));

  if (vendorJs) js.push(`/static/${vendorJs}`);
  if (mainJs) js.push(`/static/${mainJs}`);
  if (mainCss) css.push(`/static/${mainCss}`);

  // Fallback if naming convention changes.
  if (js.length === 0) {
    js.push(
      ...files
        .filter((f) => f.endsWith('.js'))
        .map((f) => `/static/${f}`)
        .sort()
    );
  }
  if (css.length === 0) {
    css.push(
      ...files
        .filter((f) => f.endsWith('.css'))
        .map((f) => `/static/${f}`)
        .sort()
    );
  }

  _prodAssets = { js, css };
  return _prodAssets;
}

// 1. Cache storage
const htmlCache = new Map<string, string>();

// 2. Notifying data store wrapper
function withMutationNotify(store: DataStore, onChange: (paths: string[]) => void): DataStore {
  return {
    ...store,
    createSong(input) {
      const song = store.createSong(input);
      onChange(['/songs', `/songs/${song.id}`]);
      return song;
    },
    updateSong(id, input) {
      const song = store.updateSong(id, input);
      if (song) onChange(['/songs', `/songs/${id}`]);
      return song;
    },
    deleteSong(id) {
      const result = store.deleteSong(id);
      if (result) onChange(['/songs', `/songs/${id}`]);
      return result;
    },
  };
}

// 3. Composition
const routeContext = new AsyncLocalStorage<string>();
const rawDataStore = createDataStore();
const notifyingStore = withMutationNotify(rawDataStore, (paths) => {
  paths.forEach((p) => {
    invalidateRoute(p);
    routeContext.run(p, () => builderApp.build(p));
  });
});
const schema = createSchema(notifyingStore);
const baseExecutor = createServerExecutor(schema);
const { executor: cachedExecutor, invalidateRoute } = createCachedExecutor(
  baseExecutor,
  routeContext,
);

// 4. Builder
const builderApp = createBuilderApp(
  cachedExecutor,
  getAssets,
  (p, html) => htmlCache.set(p, html),
  (p) => htmlCache.delete(p),
);
registerRoutes(builderApp);

// GraphQL HTTP endpoint
app.post('/graphql', createGraphQLEndpoint(schema));

// 5. Cache middleware (before universal routes)
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

// 6. Pre-warm on startup
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
