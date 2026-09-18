import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlugs } from './toc';

describe('slugify', () => {
  it('lowercases and joins words with hyphens', () => {
    expect(slugify('What we collect')).toBe('what-we-collect');
  });

  /** "What we don't do" must not become what-we-don-t-do. */
  it('drops apostrophes rather than treating them as separators', () => {
    expect(slugify("What we don't do")).toBe('what-we-dont-do');
    expect(slugify('What we don’t do')).toBe('what-we-dont-do');
  });

  /** The em dash in "Rewenn — the optional subscription" is a separator, not a character. */
  it('collapses punctuation and runs of spaces into single hyphens', () => {
    expect(slugify('Rewenn — the optional subscription')).toBe('rewenn-the-optional-subscription');
  });

  it('leaves no leading or trailing hyphen', () => {
    expect(slugify('  Contact!  ')).toBe('contact');
  });

  it('gives an empty string when there is nothing to slug', () => {
    expect(slugify('— —')).toBe('');
  });
});

describe('uniqueSlugs', () => {
  it('keeps the headings in order', () => {
    expect(uniqueSlugs(['Your account', 'Coins', 'Contact'])).toEqual([
      'your-account',
      'coins',
      'contact',
    ]);
  });

  /** Two links pointing at the same section is a silently wrong index, so repeats are numbered. */
  it('numbers repeated headings instead of colliding', () => {
    expect(uniqueSlugs(['Contact', 'Contact', 'Contact'])).toEqual([
      'contact',
      'contact-2',
      'contact-3',
    ]);
  });

  it('falls back to the position when a heading has nothing to slug', () => {
    expect(uniqueSlugs(['Children', '—'])).toEqual(['children', 'section-2']);
  });
});
