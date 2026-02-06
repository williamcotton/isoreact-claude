import type { UniversalRequest, GraphQLExecutor } from '@shared/types';
import { parseQueryString } from '@shared/utils';

export function createBrowserRequest(
  path: string,
  method: string,
  params: Record<string, string>,
  graphql: GraphQLExecutor,
  body?: any
): UniversalRequest {
  const [pathname, search] = path.split('?');
  return {
    path: pathname ?? path,
    method,
    params,
    query: parseQueryString(search ?? ''),
    body,
    graphql,
  };
}
