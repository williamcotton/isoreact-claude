export function parseQueryString(search: string): Record<string, string> {
  const params: Record<string, string> = {};
  const searchStr = search.startsWith('?') ? search.slice(1) : search;
  if (!searchStr) return params;

  for (const pair of searchStr.split('&')) {
    const [key, value] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value ?? '');
    }
  }
  return params;
}

export function parseFormBody(body: string): Record<string, string> {
  return parseQueryString(body);
}
