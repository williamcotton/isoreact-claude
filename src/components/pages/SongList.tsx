import React from 'react';
import { Layout } from '@components/Layout';
import type { Song } from '@shared/graphql';

export function SongList({ initialData }: { initialData: Song[] }) {
  return (
    <Layout>
      <h1>Songs</h1>
      {initialData.length === 0 ? (
        <p>No songs yet. <a href="/songs/new">Add one!</a></p>
      ) : (
        <ul>
          {initialData.map((song) => (
            <li key={song.id}>
              <a href={`/songs/${song.id}`}>{song.title}</a> by {song.artist}
              {song.album && ` (${song.album})`}
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}
