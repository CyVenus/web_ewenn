import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COPY } from '../config';

/**
 * The hero copy is written twice: once in `config.ts` for the page and once in `index.html` for
 * the tab, the search result and the link preview. Nothing derives one from the other, and for a
 * while nothing checked either — the meta description shipped "gentle AI routes" long after the
 * page itself had been corrected to "routines". This is the check that was missing.
 */
const html = readFileSync('index.html', 'utf8');

function content(pattern: RegExp): string {
  const match = html.match(pattern);
  expect(match, `no tag matching ${pattern} in index.html`).not.toBeNull();
  return match![1];
}

/** The tab and the share card read as a sentence fragment, so they drop the headline's full stop. */
const expectedTitle = `${COPY.name} — ${COPY.headline.replace(/\.$/, '')}`;

describe('index.html head copy', () => {
  it('titles the tab with the headline', () => {
    expect(content(/<title>([^<]*)<\/title>/)).toBe(expectedTitle);
  });

  it('shares the same title', () => {
    expect(content(/<meta property="og:title" content="([^"]*)"/)).toBe(expectedTitle);
  });

  it('describes the page with the subline', () => {
    expect(content(/<meta name="description" content="([^"]*)"/)).toBe(COPY.subline);
  });

  it('shares the same description', () => {
    expect(content(/<meta property="og:description" content="([^"]*)"/)).toBe(COPY.subline);
  });
});
