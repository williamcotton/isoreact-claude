// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseQueryString, parseFormBody } from '@shared/utils/url';

describe('parseQueryString', () => {
  it('returns empty object for empty string', () => {
    expect(parseQueryString('')).toEqual({});
  });

  it('parses string without ? prefix', () => {
    expect(parseQueryString('foo=bar')).toEqual({ foo: 'bar' });
  });

  it('strips ? prefix and parses', () => {
    expect(parseQueryString('?foo=bar')).toEqual({ foo: 'bar' });
  });

  it('parses multiple parameters', () => {
    expect(parseQueryString('a=1&b=2&c=3')).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('decodes encoded characters', () => {
    expect(parseQueryString('name=hello%20world')).toEqual({ name: 'hello world' });
    expect(parseQueryString('name=hello+world')).toEqual({ name: 'hello world' });
    expect(parseQueryString('val=a%26b')).toEqual({ val: 'a&b' });
  });

  it('handles parameter with empty value', () => {
    expect(parseQueryString('key=')).toEqual({ key: '' });
  });

  it('last value wins for duplicate keys', () => {
    const result = parseQueryString('x=1&x=2');
    expect(result.x).toBe('2');
  });
});

describe('parseFormBody', () => {
  it('delegates to parseQueryString', () => {
    expect(parseFormBody('title=Hello&artist=World')).toEqual({
      title: 'Hello',
      artist: 'World',
    });
  });
});
