import React from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { load } from 'cheerio';
import type { CheerioAPI } from 'cheerio';

export async function renderComponent(
  element: ReactElement,
): Promise<{ $: CheerioAPI; container: HTMLElement }> {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);
  await act(async () => {
    root.render(element);
  });

  const $ = load(container.innerHTML);
  return { $, container };
}
