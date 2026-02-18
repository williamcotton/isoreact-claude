import type Database from 'better-sqlite3';
import type { Song, DataStore } from '@shared/graphql';

interface SongRow {
  id: number;
  title: string;
  artist: string;
  album: string | null;
  year: string | null;
}

function rowToSong(row: SongRow): Song {
  const song: Song = { id: String(row.id), title: row.title, artist: row.artist };
  if (row.album !== null) song.album = row.album;
  if (row.year !== null) song.year = row.year;
  return song;
}

export function createSqliteDataStore(db: Database.Database): DataStore {
  const stmts = {
    getAll: db.prepare('SELECT id, title, artist, album, year FROM songs ORDER BY id'),
    getById: db.prepare('SELECT id, title, artist, album, year FROM songs WHERE id = ?'),
    getByArtist: db.prepare('SELECT id, title, artist, album, year FROM songs WHERE LOWER(artist) = LOWER(?)'),
    insert: db.prepare('INSERT INTO songs (title, artist, album, year) VALUES (?, ?, ?, ?)'),
    delete: db.prepare('DELETE FROM songs WHERE id = ?'),
  };

  return {
    getSongs(): Song[] {
      return (stmts.getAll.all() as SongRow[]).map(rowToSong);
    },

    getSong(id: string): Song | undefined {
      const row = stmts.getById.get(Number(id)) as SongRow | undefined;
      return row ? rowToSong(row) : undefined;
    },

    getSongsByArtist(artist: string): Song[] {
      return (stmts.getByArtist.all(artist) as SongRow[]).map(rowToSong);
    },

    createSong(input: Omit<Song, 'id'>): Song {
      const result = stmts.insert.run(input.title, input.artist, input.album ?? null, input.year ?? null);
      return { id: String(result.lastInsertRowid), ...input };
    },

    updateSong(id: string, input: Partial<Omit<Song, 'id'>>): Song | null {
      const existing = stmts.getById.get(Number(id)) as SongRow | undefined;
      if (!existing) return null;

      const fields: string[] = [];
      const values: any[] = [];
      for (const key of ['title', 'artist', 'album', 'year'] as const) {
        if (key in input) {
          fields.push(`${key} = ?`);
          values.push((input as any)[key] ?? null);
        }
      }
      if (fields.length > 0) {
        values.push(Number(id));
        db.prepare(`UPDATE songs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      }

      const updated = stmts.getById.get(Number(id)) as SongRow;
      return rowToSong(updated);
    },

    deleteSong(id: string): boolean {
      const result = stmts.delete.run(Number(id));
      return result.changes > 0;
    },
  };
}
