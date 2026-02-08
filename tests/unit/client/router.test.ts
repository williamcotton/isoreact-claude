// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { Router } from '@client/browser-express/router';
import type { UniversalRequest, UniversalResponse } from '@shared/types';

const noop = async (_req: UniversalRequest, _res: UniversalResponse) => {};

describe('Router', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
  });

  it('matches exact path', () => {
    router.add('get', '/songs', noop);
    const result = router.match('get', '/songs');
    expect(result).not.toBeNull();
    expect(result!.handler).toBe(noop);
    expect(result!.params).toEqual({});
  });

  it('extracts dynamic segment', () => {
    router.add('get', '/songs/:id', noop);
    const result = router.match('get', '/songs/42');
    expect(result).not.toBeNull();
    expect(result!.params).toEqual({ id: '42' });
  });

  it('returns null for no match', () => {
    router.add('get', '/songs', noop);
    expect(router.match('get', '/artists')).toBeNull();
  });

  it('matches method case-insensitively', () => {
    router.add('get', '/songs', noop);
    expect(router.match('GET', '/songs')).not.toBeNull();
  });

  it('does not match wrong method', () => {
    router.add('post', '/songs', noop);
    expect(router.match('get', '/songs')).toBeNull();
  });

  it('first registered route wins for overlapping patterns', () => {
    const handler1 = async () => {};
    const handler2 = async () => {};
    router.add('get', '/songs/:id', handler1 as any);
    router.add('get', '/songs/:slug', handler2 as any);
    const result = router.match('get', '/songs/abc');
    expect(result!.handler).toBe(handler1);
  });

  it('extracts multiple dynamic segments', () => {
    router.add('get', '/artists/:artist/songs/:id', noop);
    const result = router.match('get', '/artists/queen/songs/1');
    expect(result).not.toBeNull();
    expect(result!.params).toEqual({ artist: 'queen', id: '1' });
  });
});
