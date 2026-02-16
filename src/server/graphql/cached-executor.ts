import type { AsyncLocalStorage } from 'async_hooks';
import type { GraphQLExecutor, GraphQLResult } from '@shared/types';

export interface CachedExecutorHandle {
  executor: GraphQLExecutor;
  invalidateRoute: (path: string) => void;
  getRouteDependencies: (path: string) => Set<string> | undefined;
  getQueryCacheSize: () => number;
}

export function createCachedExecutor(
  baseExecutor: GraphQLExecutor,
  routeContext: AsyncLocalStorage<string>,
): CachedExecutorHandle {
  const queryCache = new Map<string, Promise<GraphQLResult>>();
  const routeDependencies = new Map<string, Set<string>>();

  function makeCacheKey(query: string, variables?: Record<string, any>): string {
    return JSON.stringify({ query: query.trim(), variables });
  }

  const executor: GraphQLExecutor = (query, variables) => {
    if (query.trim().startsWith('mutation')) {
      return baseExecutor(query, variables);
    }

    const key = makeCacheKey(query, variables);

    const route = routeContext.getStore();
    if (route) {
      let deps = routeDependencies.get(route);
      if (!deps) {
        deps = new Set();
        routeDependencies.set(route, deps);
      }
      deps.add(key);
    }

    const cached = queryCache.get(key);
    if (cached) return cached;

    const promise = baseExecutor(query, variables);

    queryCache.set(key, promise);

    promise.catch(() => {
      queryCache.delete(key);
    });

    return promise;
  };

  function invalidateRoute(path: string): void {
    const deps = routeDependencies.get(path);
    if (!deps) return;
    for (const key of deps) {
      queryCache.delete(key);
    }
    routeDependencies.delete(path);
  }

  return {
    executor,
    invalidateRoute,
    getRouteDependencies: (path) => routeDependencies.get(path),
    getQueryCacheSize: () => queryCache.size,
  };
}
