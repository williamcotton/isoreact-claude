export function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function renderHtmlShell({ appHtml, initialData, assets }: {
  appHtml: string;
  initialData: string;
  assets: { js: string[]; css: string[]; inlineCss?: string };
}): string {
  const cssLinks = assets.inlineCss
    ? `<style>${assets.inlineCss}</style>`
    : assets.css.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n    ');
  const scriptTags = assets.js.map((src) => `<script defer src="${src}"></script>`).join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>IsoReact</title>
    ${cssLinks}
</head>
<body>
    <div id="root">${appHtml}</div>
    <script>window.__INITIAL_DATA__ = ${initialData};</script>
    ${scriptTags}
</body>
</html>`;
}
