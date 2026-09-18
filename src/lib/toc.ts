/**
 * Slugs for the section links on a document page.
 *
 * The legal documents are plain JSX prose — the headings carry no ids of their own, and giving
 * them hand-written ones would mean editing three files of transcribed legal text every time a
 * heading is reworded. So the ids are derived from the heading text instead, which keeps
 * `src/content/*.tsx` untouched and makes a stale id impossible.
 */

/**
 * A heading's text as a URL fragment: lowercase, words joined by hyphens.
 *
 * Apostrophes are dropped rather than replaced, so "What we don't do" gives `what-we-dont-do`
 * and not `what-we-don-t-do`. Everything else that is not a letter or a digit — including the
 * em dash in "Rewenn — the optional subscription" — becomes a separator.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['‘’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Slugs for a document's headings, in order, guaranteed distinct.
 *
 * A duplicate would silently point two links at the same section, so repeats get `-2`, `-3` and
 * so on. A heading with no sluggable characters at all falls back to its position.
 */
export function uniqueSlugs(titles: readonly string[]): string[] {
  const used = new Map<string, number>();
  return titles.map((title, index) => {
    const base = slugify(title) || `section-${index + 1}`;
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  });
}
