import { describe, expect, it } from 'vitest';
import { DOC_ROUTES } from './routes';
import { FONT_WEIGHTS, buildFontPreloads, buildSpeculationRules, buildWasmPreload, fontPreloadWeights } from './warmup';

describe('buildFontPreloads', () => {
  it('asks for each file as a CORS font, so the stylesheet reuses the entry', () => {
    expect(buildFontPreloads(['/assets/fredoka-latin-400-normal-abc.woff2'])).toEqual([
      {
        tag: 'link',
        attrs: {
          rel: 'preload',
          href: '/assets/fredoka-latin-400-normal-abc.woff2',
          as: 'font',
          type: 'font/woff2',
          crossorigin: '',
        },
      },
    ]);
  });

  /* A preload without `crossorigin` warms a cache entry the stylesheet cannot use, and the
     browser fetches the font a second time -- a slower page than having no preload at all. */
  it('never omits crossorigin', () => {
    const tags = buildFontPreloads(['/a.woff2', '/b.woff2']);
    expect(tags).toHaveLength(2);
    for (const tag of tags) expect(tag.attrs).toHaveProperty('crossorigin', '');
  });

  it('covers every weight the pages import', () => {
    expect(FONT_WEIGHTS).toEqual([400, 500, 600]);
  });
});

describe('buildSpeculationRules', () => {
  const rules = (path: string) => JSON.parse(buildSpeculationRules(path));
  const docPaths = DOC_ROUTES.map((name) => `/${name}/`);

  it('prerenders the other documents and never the one being read', () => {
    expect(rules('/privacy/').prerender).toEqual([
      { where: { href_matches: ['/terms/', '/support/'] }, eagerness: 'moderate' },
    ]);
  });

  it('prerenders all three documents from the home page', () => {
    expect(rules('/').prerender).toEqual([
      { where: { href_matches: docPaths }, eagerness: 'moderate' },
    ]);
  });

  it('eagerly prefetches every reachable page, including the home page', () => {
    expect(rules('/privacy/').prefetch).toEqual([
      { where: { href_matches: ['/', '/terms/', '/support/'] }, eagerness: 'eager' },
    ]);
    expect(rules('/').prefetch).toEqual([
      { where: { href_matches: docPaths }, eagerness: 'eager' },
    ]);
  });

  /*
   * The asymmetry is the point, not an oversight. A prerendered home page would stand up a
   * WebGL2 context in a document that is not being composited, and if that fails the scene
   * latches its static-sky fallback -- so the home page is only ever prefetched.
   */
  it('prefetches the home page but never prerenders it', () => {
    const fromDoc = rules('/terms/');
    expect(fromDoc.prefetch[0].where.href_matches).toContain('/');
    expect(fromDoc.prerender[0].where.href_matches).not.toContain('/');
  });

  it('never speculates about the page being read', () => {
    for (const path of ['/', ...docPaths]) {
      const all = [...rules(path).prefetch ?? [], ...rules(path).prerender ?? []];
      for (const rule of all) expect(rule.where.href_matches).not.toContain(path);
    }
  });

  it('is valid JSON for every page the site builds', () => {
    for (const path of ['/', ...docPaths]) {
      expect(() => JSON.parse(buildSpeculationRules(path))).not.toThrow();
    }
  });
});

describe('buildWasmPreload', () => {
  it('preloads the runtime on the home page as a CORS fetch', () => {
    expect(buildWasmPreload('/assets/rive-abc.wasm', '/')).toEqual([
      {
        tag: 'link',
        attrs: { rel: 'preload', href: '/assets/rive-abc.wasm', as: 'fetch', type: 'application/wasm', crossorigin: '' },
      },
    ]);
  });

  it('never preloads it on a document, which does not start the runtime', () => {
    expect(buildWasmPreload('/assets/rive-abc.wasm', '/privacy/')).toEqual([]);
  });

  it('emits nothing when the build has no Wasm to name', () => {
    expect(buildWasmPreload(null, '/')).toEqual([]);
  });
});

describe('fontPreloadWeights', () => {
  /* Chrome reports a preload no request claims within a few seconds of load. The home page never
     sets 500 and draws its text after load, so preloading there only produced those warnings. */
  it('preloads nothing on the home page', () => {
    expect(fontPreloadWeights('/')).toEqual([]);
  });

  it('preloads every weight on each document, where all three are set', () => {
    for (const name of DOC_ROUTES) {
      expect(fontPreloadWeights(`/${name}/`)).toEqual(FONT_WEIGHTS);
    }
  });
});
