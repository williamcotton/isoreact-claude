import type { AsyncLocalStorage } from 'async_hooks';
import type Database from 'better-sqlite3';
import type { GraphQLExecutor, GraphQLResult } from '@shared/types';
import type { CachedExecutorHandle } from './cached-executor';

export function createSqliteCachedExecutor(
  baseExecutor: GraphQLExecutor,
  routeContext: AsyncLocalStorage<string>,
  db: Database.Database,
): CachedExecutorHandle {
  // In-flight promise coalescing (not persisted — only for concurrent requests)
  const pending = new Map<string, Promise<GraphQLResult>>();

  const stmts = {
    getCache: db.prepare('SELECT result_json FROM query_cache WHERE cache_key = ?'),
    setCache: db.prepare('INSERT OR REPLACE INTO query_cache (cache_key, result_json) VALUES (?, ?)'),
    deleteCache: db.prepare('DELETE FROM query_cache WHERE cache_key = ?'),
    addDep: db.prepare('INSERT OR IGNORE INTO route_dependencies (route, cache_key) VALUES (?, ?)'),
    getDeps: db.prepare('SELECT cache_key FROM route_dependencies WHERE route = ?'),
    deleteDeps: db.prepare('DELETE FROM route_dependencies WHERE route = ?'),
    cacheSize: db.prepare('SELECT COUNT(*) as count FROM query_cache'),
  };

  const invalidateRouteTransaction = db.transaction((routePath: string) => {
    const deps = stmts.getDeps.all(routePath) as { cache_key: string }[];
    for (const dep of deps) {
      stmts.deleteCache.run(dep.cache_key);
      pending.delete(dep.cache_key);
    }
    stmts.deleteDeps.run(routePath);
  });

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
      stmts.addDep.run(route, key);
    }

    // Check in-flight promises first (concurrent coalescing)
    const inflight = pending.get(key);
    if (inflight) return inflight;

    // Check SQLite cache
    const cached = stmts.getCache.get(key) as { result_json: string } | undefined;
    if (cached) {
      return Promise.resolve(JSON.parse(cached.result_json));
    }

    // Execute and cache
    const promise = baseExecutor(query, variables);
    pending.set(key, promise);

    promise.then(
      (result) => {
        stmts.setCache.run(key, JSON.stringify(result));
        pending.delete(key);
      },
      () => {
        pending.delete(key);
      },
    );

    return promise;
  };

  function invalidateRoute(path: string): void {
    invalidateRouteTransaction(path);
  }

  return {
    executor,
    invalidateRoute,
    getRouteDependencies(path: string): Set<string> | undefined {
      const deps = stmts.getDeps.all(path) as { cache_key: string }[];
      if (deps.length === 0) return undefined;
      return new Set(deps.map((d) => d.cache_key));
    },
    getQueryCacheSize(): number {
      const row = stmts.cacheSize.get() as { count: number };
      return row.count + pending.size;
    },
  };
}
