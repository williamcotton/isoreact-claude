export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: string;
}

export interface DataStore {
  getSongs: () => Song[];
  getSong: (id: string) => Song | undefined;
  getSongsByArtist: (artist: string) => Song[];
  createSong: (input: Omit<Song, 'id'>) => Song;
  updateSong: (id: string, input: Partial<Omit<Song, 'id'>>) => Song | null;
  deleteSong: (id: string) => boolean;
}
