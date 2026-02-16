// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AsyncLocalStorage } from 'async_hooks';
import { createCachedExecutor } from '@server/graphql/cached-executor';
import type { GraphQLExecutor, GraphQLResult } from '@shared/types';

function createMockExecutor() {
  const fn = vi.fn<Parameters<GraphQLExecutor>, ReturnType<GraphQLExecutor>>();
  fn.mockResolvedValue({ data: { mock: true } });
  return fn;
}

describe('createCachedExecutor', () => {
  let routeContext: AsyncLocalStorage<string>;
  let baseExecutor: ReturnType<typeof createMockExecutor>;

  beforeEach(() => {
    routeContext = new AsyncLocalStorage<string>();
    baseExecutor = createMockExecutor();
  });

  describe('query caching', () => {
    it('caches identical queries', async () => {
      const { executor } = createCachedExecutor(baseExecutor, routeContext);

      const r1 = await executor('{ songs { id } }');
      const r2 = await executor('{ songs { id } }');

      expect(baseExecutor).toHaveBeenCalledTimes(1);
      expect(r1).toBe(r2);
    });

    it('treats different variables as separate cache entries', async () => {
      const { executor } = createCachedExecutor(baseExecutor, routeContext);

      await executor('query($id: String!) { song(id: $id) { id } }', { id: '1' });
      await executor('query($id: String!) { song(id: $id) { id } }', { id: '2' });

      expect(baseExecutor).toHaveBeenCalledTimes(2);
    });

    it('normalizes whitespace in query strings', async () => {
      const { executor } = createCachedExecutor(baseExecutor, routeContext);

      await executor('  { songs { id } }  ');
      await executor('{ songs { id } }');

      expect(baseExecutor).toHaveBeenCalledTimes(1);
    });

    it('treats different queries as separate cache entries', async () => {
      const { executor } = createCachedExecutor(baseExecutor, routeContext);

      await executor('{ songs { id } }');
      await executor('{ songs { id title } }');

      expect(baseExecutor).toHaveBeenCalledTimes(2);
    });
  });

  describe('mutation bypass', () => {
    it('never caches mutations', async () => {
      baseExecutor.mockResolvedValue({ data: { createSong: { id: '1' } } });
      const { executor, getQueryCacheSize } = createCachedExecutor(baseExecutor, routeContext);

      await executor('mutation { createSong(input: {}) { id } }');
      await executor('mutation { createSong(input: {}) { id } }');

      expect(baseExecutor).toHaveBeenCalledTimes(2);
      expect(getQueryCacheSize()).toBe(0);
    });

    it('bypasses cache for mutations with leading whitespace', async () => {
      const { executor } = createCachedExecutor(baseExecutor, routeContext);

      await executor('  mutation { createSong(input: {}) { id } }');
      await executor('  mutation { createSong(input: {}) { id } }');

      expect(baseExecutor).toHaveBeenCalledTimes(2);
    });
  });

  describe('dependency tracking', () => {
    it('records dependencies inside routeContext.run()', async () => {
      const { executor, getRouteDependencies } = createCachedExecutor(baseExecutor, routeContext);

      await routeContext.run('/songs', () => executor('{ songs { id } }'));

      const deps = getRouteDependencies('/songs');
      expect(deps).toBeDefined();
      expect(deps!.size).toBe(1);
    });

    it('does not record dependencies without route context', async () => {
      const { executor, getRouteDependencies } = createCachedExecutor(baseExecutor, routeContext);

      await executor('{ songs { id } }');

      expect(getRouteDependencies('/songs')).toBeUndefined();
    });

    it('tracks separate dependencies per route', async () => {
      const { executor, getRouteDependencies } = createCachedExecutor(baseExecutor, routeContext);

      await routeContext.run('/songs', () => executor('{ songs { id } }'));
      await routeContext.run('/songs/1', () =>
        executor('query($id: String!) { song(id: $id) { id } }', { id: '1' }),
      );

      expect(getRouteDependencies('/songs')!.size).toBe(1);
      expect(getRouteDependencies('/songs/1')!.size).toBe(1);
    });

    it('accumulates multiple queries for the same route', async () => {
      const { executor, getRouteDependencies } = createCachedExecutor(baseExecutor, routeContext);

      await routeContext.run('/songs', async () => {
        await executor('{ songs { id } }');
        await executor('{ songs { id title } }');
      });

      expect(getRouteDependencies('/songs')!.size).toBe(2);
    });
  });

  describe('invalidateRoute', () => {
    it('removes cache entries for the invalidated route', async () => {
      const { executor, invalidateRoute, getQueryCacheSize } = createCachedExecutor(
        baseExecutor,
        routeContext,
      );

      await routeContext.run('/songs', () => executor('{ songs { id } }'));
      expect(getQueryCacheSize()).toBe(1);

      invalidateRoute('/songs');
      expect(getQueryCacheSize()).toBe(0);
    });

    it('clears the dependency set for the route', async () => {
      const { executor, invalidateRoute, getRouteDependencies } = createCachedExecutor(
        baseExecutor,
        routeContext,
      );

      await routeContext.run('/songs', () => executor('{ songs { id } }'));
      invalidateRoute('/songs');

      expect(getRouteDependencies('/songs')).toBeUndefined();
    });

    it('is a no-op for unknown routes', () => {
      const { invalidateRoute } = createCachedExecutor(baseExecutor, routeContext);
      expect(() => invalidateRoute('/unknown')).not.toThrow();
    });

    it('only invalidates entries for the specified route', async () => {
      const { executor, invalidateRoute, getQueryCacheSize } = createCachedExecutor(
        baseExecutor,
        routeContext,
      );

      await routeContext.run('/songs', () => executor('{ songs { id } }'));
      await routeContext.run('/songs/1', () =>
        executor('query($id: String!) { song(id: $id) { id } }', { id: '1' }),
      );
      expect(getQueryCacheSize()).toBe(2);

      invalidateRoute('/songs');
      expect(getQueryCacheSize()).toBe(1);
    });

    it('handles shared queries between routes', async () => {
      const { executor, invalidateRoute, getQueryCacheSize, getRouteDependencies } =
        createCachedExecutor(baseExecutor, routeContext);

      // Both routes use the same query
      await routeContext.run('/songs', () => executor('{ songs { id } }'));
      await routeContext.run('/', () => executor('{ songs { id } }'));
      expect(getQueryCacheSize()).toBe(1);

      // Invalidating one route removes the shared cache entry
      invalidateRoute('/songs');
      expect(getQueryCacheSize()).toBe(0);

      // But the other route's dependency set is still intact
      expect(getRouteDependencies('/')).toBeDefined();
    });
  });

  describe('rebuild re-recording', () => {
    it('re-records dependencies after invalidate and re-execute', async () => {
      const { executor, invalidateRoute, getRouteDependencies } = createCachedExecutor(
        baseExecutor,
        routeContext,
      );

      await routeContext.run('/songs', () => executor('{ songs { id } }'));
      invalidateRoute('/songs');
      expect(getRouteDependencies('/songs')).toBeUndefined();

      await routeContext.run('/songs', () => executor('{ songs { id } }'));
      expect(getRouteDependencies('/songs')).toBeDefined();
      expect(getRouteDependencies('/songs')!.size).toBe(1);
      expect(baseExecutor).toHaveBeenCalledTimes(2);
    });
  });

  describe('concurrent coalescing', () => {
    it('shares a single Promise for concurrent calls with the same key', async () => {
      let resolvePromise: (value: GraphQLResult) => void;
      baseExecutor.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const { executor } = createCachedExecutor(baseExecutor, routeContext);

      const p1 = executor('{ songs { id } }');
      const p2 = executor('{ songs { id } }');

      resolvePromise!({ data: { songs: [] } });

      const [r1, r2] = await Promise.all([p1, p2]);

      expect(baseExecutor).toHaveBeenCalledTimes(1);
      expect(r1).toBe(r2);
    });
  });

  describe('error resilience', () => {
    it('removes cache entry on rejected promise', async () => {
      baseExecutor.mockRejectedValueOnce(new Error('GraphQL failed'));
      const { executor, getQueryCacheSize } = createCachedExecutor(baseExecutor, routeContext);

      await expect(executor('{ songs { id } }')).rejects.toThrow('GraphQL failed');
      expect(getQueryCacheSize()).toBe(0);

      // Next call should re-execute
      baseExecutor.mockResolvedValueOnce({ data: { songs: [] } });
      await executor('{ songs { id } }');
      expect(baseExecutor).toHaveBeenCalledTimes(2);
    });
  });
});
