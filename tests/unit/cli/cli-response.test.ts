// @vitest-environment node
import { describe, it, expect } from 'vitest';
import React from 'react';
import { createCliResponse } from '@cli/cli-response';

describe('createCliResponse', () => {
  it('renders React elements to HTML via renderToStaticMarkup', () => {
    const { response, getResult } = createCliResponse();
    response.renderApp(React.createElement('h1', null, 'Hello'));
    expect(getResult().html).toBe('<h1>Hello</h1>');
  });

  it('defaults to status 200', () => {
    const { getResult } = createCliResponse();
    expect(getResult().statusCode).toBe(200);
  });

  it('captures status code', () => {
    const { response, getResult } = createCliResponse();
    response.setStatus(404);
    expect(getResult().statusCode).toBe(404);
  });

  it('captures redirect URL', () => {
    const { response, getResult } = createCliResponse();
    response.redirect('/songs');
    expect(getResult().redirectUrl).toBe('/songs');
  });

  it('defaults redirectUrl to null', () => {
    const { getResult } = createCliResponse();
    expect(getResult().redirectUrl).toBeNull();
  });
});
