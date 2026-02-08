// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createDataStore } from '@server/graphql/data-store';

describe('dataStore', () => {
  let store: ReturnType<typeof createDataStore>;

  beforeEach(() => {
    store = createDataStore();
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
    it('assigns incrementing ID and adds to store', () => {
      const song = store.createSong({ title: 'New Song', artist: 'Artist' });
      expect(song.id).toBe('4');
      expect(store.getSongs()).toHaveLength(4);
    });

    it('increments IDs across multiple creates', () => {
      const s1 = store.createSong({ title: 'A', artist: 'X' });
      const s2 = store.createSong({ title: 'B', artist: 'Y' });
      expect(s1.id).toBe('4');
      expect(s2.id).toBe('5');
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
