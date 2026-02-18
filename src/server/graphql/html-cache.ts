import type Database from 'better-sqlite3';

export interface HtmlCache {
  get(path: string): string | undefined;
  set(path: string, html: string): void;
  delete(path: string): void;
  readonly size: number;
}

export function createSqliteHtmlCache(db: Database.Database): HtmlCache {
  const stmts = {
    get: db.prepare('SELECT html FROM html_cache WHERE path = ?'),
    set: db.prepare('INSERT OR REPLACE INTO html_cache (path, html) VALUES (?, ?)'),
    delete: db.prepare('DELETE FROM html_cache WHERE path = ?'),
    size: db.prepare('SELECT COUNT(*) as count FROM html_cache'),
  };

  return {
    get(path: string): string | undefined {
      const row = stmts.get.get(path) as { html: string } | undefined;
      return row?.html;
    },
    set(path: string, html: string): void {
      stmts.set.run(path, html);
    },
    delete(path: string): void {
      stmts.delete.run(path);
    },
    get size(): number {
      const row = stmts.size.get() as { count: number };
      return row.count;
    },
  };
}
