import type { DataStore } from '@shared/graphql';

export function withMutationNotify(
  store: DataStore,
  onChange: (paths: string[]) => void,
): DataStore {
  return {
    ...store,
    createSong(input) {
      const song = store.createSong(input);
      onChange(['/songs', `/songs/${song.id}`]);
      return song;
    },
    updateSong(id, input) {
      const song = store.updateSong(id, input);
      if (song) onChange(['/songs', `/songs/${id}`]);
      return song;
    },
    deleteSong(id) {
      const result = store.deleteSong(id);
      if (result) onChange(['/songs', `/songs/${id}`]);
      return result;
    },
  };
}
