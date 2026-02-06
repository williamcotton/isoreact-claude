import type { Song } from '@shared/graphql';

let nextId = 4;

const songs: Song[] = [
  { id: '1', title: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night at the Opera', year: '1975' },
  { id: '2', title: 'Hotel California', artist: 'Eagles', album: 'Hotel California', year: '1977' },
  { id: '3', title: 'Stairway to Heaven', artist: 'Led Zeppelin', album: 'Led Zeppelin IV', year: '1971' },
];

export const dataStore = {
  getSongs: (): Song[] => [...songs],

  getSong: (id: string): Song | undefined => songs.find((s) => s.id === id),

  getSongsByArtist: (artist: string): Song[] =>
    songs.filter((s) => s.artist.toLowerCase() === artist.toLowerCase()),

  createSong: (input: Omit<Song, 'id'>): Song => {
    const song: Song = { id: String(nextId++), ...input };
    songs.push(song);
    return song;
  },

  updateSong: (id: string, input: Partial<Omit<Song, 'id'>>): Song | null => {
    const song = songs.find((s) => s.id === id);
    if (!song) return null;
    Object.assign(song, input);
    return song;
  },

  deleteSong: (id: string): boolean => {
    const idx = songs.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    songs.splice(idx, 1);
    return true;
  },
};
