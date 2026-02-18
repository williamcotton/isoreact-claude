import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { SEED_SONGS } from './data-store';

export function openDatabase(dbPath?: string): Database.Database {
  const resolvedPath = dbPath ?? path.resolve(process.cwd(), 'data', 'isoreact.db');

  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      album TEXT,
      year TEXT
    );

    CREATE TABLE IF NOT EXISTS query_cache (
      cache_key TEXT PRIMARY KEY,
      result_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS route_dependencies (
      route TEXT NOT NULL,
      cache_key TEXT NOT NULL,
      PRIMARY KEY (route, cache_key)
    );

    CREATE TABLE IF NOT EXISTS html_cache (
      path TEXT PRIMARY KEY,
      html TEXT NOT NULL
    );
  `);

  const count = db.prepare('SELECT COUNT(*) as count FROM songs').get() as { count: number };
  if (count.count === 0) {
    const insert = db.prepare('INSERT INTO songs (id, title, artist, album, year) VALUES (?, ?, ?, ?, ?)');
    const seedAll = db.transaction(() => {
      for (const song of SEED_SONGS) {
        insert.run(Number(song.id), song.title, song.artist, song.album ?? null, song.year ?? null);
      }
    });
    seedAll();
  }

  return db;
}
