import React from 'react';
import { Layout } from '@components/Layout';
import type { Song } from '@shared/graphql';

export function SongDetail({ song }: { song: Song | null }) {
  if (!song) {
    return (
      <Layout>
        <h1>Song Not Found</h1>
        <p><a href="/songs">Back to songs</a></p>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1>{song.title}</h1>
      <dl>
        <dt>Artist</dt>
        <dd>{song.artist}</dd>
        {song.album && (
          <>
            <dt>Album</dt>
            <dd>{song.album}</dd>
          </>
        )}
        {song.year && (
          <>
            <dt>Year</dt>
            <dd>{song.year}</dd>
          </>
        )}
      </dl>
      <p><a href="/songs">Back to songs</a></p>
    </Layout>
  );
}
