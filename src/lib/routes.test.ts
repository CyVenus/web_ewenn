import { describe, expect, it } from 'vitest';
import { DOC_ROUTES, canonicalPath, docAliases } from './routes';

describe('canonicalPath', () => {
  it('reduces a build entry and a dev request to the same directory URL', () => {
    expect(canonicalPath('privacy/index.html')).toBe('/privacy/');
    expect(canonicalPath('/privacy/')).toBe('/privacy/');
    expect(canonicalPath('/privacy/index.html')).toBe('/privacy/');
  });

  it('maps the home entry to the root', () => {
    expect(canonicalPath('index.html')).toBe('/');
    expect(canonicalPath('/')).toBe('/');
  });

  it('ignores a query string, so ?phase= cannot leak into a canonical URL', () => {
    expect(canonicalPath('/terms/?phase=night')).toBe('/terms/');
    expect(canonicalPath('/?phase=0')).toBe('/');
  });
});

describe('docAliases', () => {
  /**
   * App Store Connect's app record, both Rewenn subscription products and the paywall inside the
   * binary all point at /privacy.html and /terms.html. Those URLs predate this site and cannot be
   * changed from here, so the build has to keep answering them.
   */
  it('publishes every document at the .html URL Apple already links to', () => {
    expect(docAliases()).toEqual([
      { from: 'privacy/index.html', to: 'privacy.html' },
      { from: 'terms/index.html', to: 'terms.html' },
      { from: 'support/index.html', to: 'support.html' },
    ]);
  });

  it('covers every route, so adding one cannot forget its alias', () => {
    expect(docAliases()).toHaveLength(DOC_ROUTES.length);
    expect(docAliases().map((alias) => alias.to.replace('.html', ''))).toEqual([...DOC_ROUTES]);
  });

  it('keeps privacy and terms in the list, since external links depend on them', () => {
    expect(DOC_ROUTES).toContain('privacy');
    expect(DOC_ROUTES).toContain('terms');
  });
});
