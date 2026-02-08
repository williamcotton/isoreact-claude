import { graphql } from 'graphql';
import { createSchema } from '@shared/graphql/schema';
import { createDataStore } from '@server/graphql/data-store';
import type { GraphQLExecutor } from '@shared/types';

export function createTestExecutor(): GraphQLExecutor {
  const dataStore = createDataStore();
  const schema = createSchema(dataStore);

  return async (query, variables) => {
    const result = await graphql({ schema, source: query, variableValues: variables });
    return {
      data: result.data as any,
      errors: result.errors?.map((e) => ({ message: e.message })),
    };
  };
}
