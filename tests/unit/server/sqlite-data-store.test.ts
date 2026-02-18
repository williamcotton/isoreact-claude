// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { openDatabase } from '@server/graphql/database';
import { createSqliteDataStore } from '@server/graphql/sqlite-data-store';

describe('createSqliteDataStore', () => {
  let db: Database.Database;
  let store: ReturnType<typeof createSqliteDataStore>;

  beforeEach(() => {
    db = openDatabase(':memory:');
    store = createSqliteDataStore(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('getSongs', () => {
    it('returns all seed songs', () => {
      expect(store.getSongs()).toHaveLength(3);
    });

    it('returns a copy (mutating result does not affect store)', () => {
      const songs = store.getSongs();
      songs.pop();
      expect(store.getSongs()).toHaveLength(3);
    });
  });

  describe('getSong', () => {
    it('finds song by ID', () => {
      const song = store.getSong('1');
      expect(song).toBeDefined();
      expect(song!.title).toBe('Bohemian Rhapsody');
    });

    it('returns undefined for missing ID', () => {
      expect(store.getSong('999')).toBeUndefined();
    });

    it('includes optional fields when present', () => {
      const song = store.getSong('1');
      expect(song!.album).toBe('A Night at the Opera');
      expect(song!.year).toBe('1975');
    });

    it('omits optional fields when null', () => {
      store.createSong({ title: 'No Album', artist: 'Test' });
      const songs = store.getSongs();
      const last = songs[songs.length - 1];
      expect(last).not.toHaveProperty('album');
      expect(last).not.toHaveProperty('year');
    });
  });

  describe('getSongsByArtist', () => {
    it('is case-insensitive', () => {
      expect(store.getSongsByArtist('queen')).toHaveLength(1);
      expect(store.getSongsByArtist('QUEEN')).toHaveLength(1);
    });

    it('returns empty array for unknown artist', () => {
      expect(store.getSongsByArtist('Unknown')).toEqual([]);
    });
  });

  describe('createSong', () => {
    it('assigns auto-incrementing ID and adds to store', () => {
      const song = store.createSong({ title: 'New Song', artist: 'Artist' });
      expect(Number(song.id)).toBeGreaterThan(3);
      expect(store.getSongs()).toHaveLength(4);
    });

    it('increments IDs across multiple creates', () => {
      const s1 = store.createSong({ title: 'A', artist: 'X' });
      const s2 = store.createSong({ title: 'B', artist: 'Y' });
      expect(Number(s2.id)).toBeGreaterThan(Number(s1.id));
    });
  });

  describe('updateSong', () => {
    it('partial update merges fields', () => {
      const updated = store.updateSong('1', { title: 'Updated Title' });
      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('Updated Title');
      expect(updated!.artist).toBe('Queen');
    });

    it('returns null for missing ID', () => {
      expect(store.updateSong('999', { title: 'X' })).toBeNull();
    });
  });

  describe('deleteSong', () => {
    it('removes song and returns true', () => {
      expect(store.deleteSong('1')).toBe(true);
      expect(store.getSongs()).toHaveLength(2);
      expect(store.getSong('1')).toBeUndefined();
    });

    it('returns false for missing ID', () => {
      expect(store.deleteSong('999')).toBe(false);
    });
  });
});
