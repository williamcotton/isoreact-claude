import type { CheerioAPI } from 'cheerio';

export interface AppDriver {
  visit(url: string): Promise<void>;
  clickLink(text: string): Promise<void>;
  getCurrentUrl(): string;
  readonly $: CheerioAPI;
}
