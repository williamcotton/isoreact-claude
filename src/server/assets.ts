import fs from 'fs';
import path from 'path';

export interface BuildAssets {
  js: string[];
  css: string[];
  inlineCss?: string;
}

export function createAssetResolver(isDev: boolean, clientDir: string): () => BuildAssets {
  if (isDev) {
    const inlineCss = readDevCss(clientDir);
    return () => ({
      js: [
        'http://localhost:3010/static/vendors.js',
        'http://localhost:3010/static/main.js',
      ],
      css: [],
      inlineCss,
    });
  }

  let cached: BuildAssets | null = null;
  return () => {
    if (cached) return cached;
    cached = loadProdAssets(clientDir);
    return cached;
  };
}

// In dev mode, read the CSS source so we can inline it into the HTML
// to prevent a flash of unstyled content (style-loader handles HMR after hydration).
function readDevCss(clientDir: string): string {
  try {
    return fs.readFileSync(
      path.resolve(clientDir, '../../src/components/styles.css'),
      'utf-8',
    );
  } catch {
    return '';
  }
}

function loadProdAssets(clientDir: string): BuildAssets {
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
        .sort(),
    );
  }
  if (css.length === 0) {
    css.push(
      ...files
        .filter((f) => f.endsWith('.css'))
        .map((f) => `/static/${f}`)
        .sort(),
    );
  }

  return { js, css };
}
