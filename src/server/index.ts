import express from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { createSchema } from '@shared/graphql/schema';
import { dataStore, createServerExecutor, createGraphQLEndpoint } from './graphql';
import { createServerApp } from './create-server-app';
import { registerRoutes } from '@shared/universal-app';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
const clientDir = path.resolve(__dirname, '../client');
app.use('/static', express.static(clientDir, { maxAge: '1y', immutable: true }));

interface BuildAssets {
  js: string[];
  css: string[];
}

// Build asset manifest once at startup to avoid per-request disk reads.
function loadAssets(): BuildAssets {
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

  return { js, css };
}
const buildAssets = loadAssets();
function getAssets(): BuildAssets {
  return buildAssets;
}

// GraphQL
const schema = createSchema(dataStore);
const executor = createServerExecutor(schema);

// GraphQL HTTP endpoint
app.post('/graphql', createGraphQLEndpoint(schema));

// Universal routes
const universalApp = createServerApp(app, executor, getAssets);
registerRoutes(universalApp);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
