import { parseFormBody } from '@shared/utils';

type NavigateHandler = (path: string, method: string, body?: any) => void;

export function setupInterceptor(onNavigate: NavigateHandler) {
  // Intercept link clicks
  document.addEventListener('click', (e) => {
    const anchor = (e.target as Element).closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#')) return;

    // Check for modifier keys
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    e.preventDefault();
    window.history.pushState(null, '', href);
    onNavigate(href, 'GET');
  });

  // Intercept form submissions
  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement;
    const action = form.getAttribute('action');
    const method = (form.getAttribute('method') ?? 'GET').toUpperCase();

    if (!action || action.startsWith('http')) return;

    e.preventDefault();
    const formData = new FormData(form);
    const body: Record<string, string> = {};
    formData.forEach((value, key) => {
      body[key] = value.toString();
    });

    if (method === 'GET') {
      const search = new URLSearchParams(body).toString();
      const url = search ? `${action}?${search}` : action;
      window.history.pushState(null, '', url);
      onNavigate(url, 'GET');
    } else {
      onNavigate(action, method, body);
    }
  });

  // Handle back/forward navigation
  window.addEventListener('popstate', () => {
    onNavigate(window.location.pathname + window.location.search, 'GET');
  });
}
