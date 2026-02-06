import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInputObjectType,
  GraphQLBoolean,
} from 'graphql';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: string;
}

const SongType = new GraphQLObjectType({
  name: 'Song',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    artist: { type: new GraphQLNonNull(GraphQLString) },
    album: { type: GraphQLString },
    year: { type: GraphQLString },
  },
});

const CreateSongInputType = new GraphQLInputObjectType({
  name: 'CreateSongInput',
  fields: {
    title: { type: new GraphQLNonNull(GraphQLString) },
    artist: { type: new GraphQLNonNull(GraphQLString) },
    album: { type: GraphQLString },
    year: { type: GraphQLString },
  },
});

const UpdateSongInputType = new GraphQLInputObjectType({
  name: 'UpdateSongInput',
  fields: {
    title: { type: GraphQLString },
    artist: { type: GraphQLString },
    album: { type: GraphQLString },
    year: { type: GraphQLString },
  },
});

export function createSchema(dataStore: {
  getSongs: () => Song[];
  getSong: (id: string) => Song | undefined;
  getSongsByArtist: (artist: string) => Song[];
  createSong: (input: Omit<Song, 'id'>) => Song;
  updateSong: (id: string, input: Partial<Omit<Song, 'id'>>) => Song | null;
  deleteSong: (id: string) => boolean;
}) {
  const QueryType = new GraphQLObjectType({
    name: 'Query',
    fields: {
      songs: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(SongType))),
        resolve: () => dataStore.getSongs(),
      },
      song: {
        type: SongType,
        args: {
          id: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: (_, { id }) => dataStore.getSong(id),
      },
      songsByArtist: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(SongType))),
        args: {
          artist: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: (_, { artist }) => dataStore.getSongsByArtist(artist),
      },
    },
  });

  const MutationType = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      createSong: {
        type: new GraphQLNonNull(SongType),
        args: {
          input: { type: new GraphQLNonNull(CreateSongInputType) },
        },
        resolve: (_, { input }) => dataStore.createSong(input),
      },
      updateSong: {
        type: SongType,
        args: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          input: { type: new GraphQLNonNull(UpdateSongInputType) },
        },
        resolve: (_, { id, input }) => dataStore.updateSong(id, input),
      },
      deleteSong: {
        type: new GraphQLNonNull(GraphQLBoolean),
        args: {
          id: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: (_, { id }) => dataStore.deleteSong(id),
      },
    },
  });

  return new GraphQLSchema({
    query: QueryType,
    mutation: MutationType,
  });
}
