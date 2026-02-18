// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { openDatabase } from '@server/graphql/database';
import { createSqliteHtmlCache } from '@server/graphql/html-cache';
import type { HtmlCache } from '@server/graphql/html-cache';

describe('createSqliteHtmlCache', () => {
  let db: Database.Database;
  let cache: HtmlCache;

  beforeEach(() => {
    db = openDatabase(':memory:');
    cache = createSqliteHtmlCache(db);
  });

  afterEach(() => {
    db.close();
  });

  it('returns undefined for missing path', () => {
    expect(cache.get('/missing')).toBeUndefined();
  });

  it('stores and retrieves HTML', () => {
    cache.set('/songs', '<html>songs</html>');
    expect(cache.get('/songs')).toBe('<html>songs</html>');
  });

  it('overwrites existing entries', () => {
    cache.set('/songs', '<html>v1</html>');
    cache.set('/songs', '<html>v2</html>');
    expect(cache.get('/songs')).toBe('<html>v2</html>');
    expect(cache.size).toBe(1);
  });

  it('deletes entries', () => {
    cache.set('/songs', '<html>songs</html>');
    cache.delete('/songs');
    expect(cache.get('/songs')).toBeUndefined();
  });

  it('delete is a no-op for missing path', () => {
    expect(() => cache.delete('/missing')).not.toThrow();
  });

  it('tracks size correctly', () => {
    expect(cache.size).toBe(0);
    cache.set('/songs', '<html>songs</html>');
    expect(cache.size).toBe(1);
    cache.set('/songs/new', '<html>new</html>');
    expect(cache.size).toBe(2);
    cache.delete('/songs');
    expect(cache.size).toBe(1);
  });
});
