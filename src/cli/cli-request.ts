import type { UniversalRequest, GraphQLExecutor } from '@shared/types';
import { parseQueryString, parseFormBody } from '@shared/utils';

export function createCliRequest(
  path: string,
  method: string,
  params: Record<string, string>,
  graphql: GraphQLExecutor,
  body?: string
): UniversalRequest {
  const [pathname, search] = path.split('?');
  return {
    path: pathname ?? path,
    method,
    params,
    query: parseQueryString(search ?? ''),
    body: body ? parseFormBody(body) : undefined,
    graphql,
  };
}
