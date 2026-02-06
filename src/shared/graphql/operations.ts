export const SONGS_QUERY = `
  query Songs {
    songs {
      id
      title
      artist
      album
      year
    }
  }
`;

export const SONG_QUERY = `
  query Song($id: String!) {
    song(id: $id) {
      id
      title
      artist
      album
      year
    }
  }
`;

export const SONGS_BY_ARTIST_QUERY = `
  query SongsByArtist($artist: String!) {
    songsByArtist(artist: $artist) {
      id
      title
      artist
      album
      year
    }
  }
`;

export const CREATE_SONG_MUTATION = `
  mutation CreateSong($input: CreateSongInput!) {
    createSong(input: $input) {
      id
      title
      artist
      album
      year
    }
  }
`;

export const UPDATE_SONG_MUTATION = `
  mutation UpdateSong($id: String!, $input: UpdateSongInput!) {
    updateSong(id: $id, input: $input) {
      id
      title
      artist
      album
      year
    }
  }
`;

export const DELETE_SONG_MUTATION = `
  mutation DeleteSong($id: String!) {
    deleteSong(id: $id)
  }
`;
