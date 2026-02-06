import type { Request, Response } from 'express';
import { graphql } from 'graphql';
import type { GraphQLSchema } from 'graphql';

export function createGraphQLEndpoint(schema: GraphQLSchema) {
  return async (req: Request, res: Response) => {
    const { query, variables } = req.body;
    if (!query) {
      res.status(400).json({ errors: [{ message: 'Missing query' }] });
      return;
    }
    const result = await graphql({ schema, source: query, variableValues: variables });
    res.json({
      data: result.data,
      errors: result.errors?.map((e) => ({ message: e.message })),
    });
  };
}
