import type { HeadTag } from './headTags.ts';
import { DOC_ROUTES } from './routes.ts';

/**
 * What each page asks the browser to have ready before the visitor asks for it.
 *
 * Both halves of this exist because of one filmed navigation. Tapping "Privacy Policy" on a
 * throttled phone left the home page on screen to 160ms, showed BLANK PAPER to 460ms, painted
 * the prose in the fallback sans-serif, and only reached Fredoka -- reflowing every line -- at
 * 620ms. Nothing there is slow; it is all discovery. The document is fetched only once the tap
 * lands, its script only once the document parses, and its fonts only once the stylesheet does.
 */

/** The weights `src/pages/*.tsx` imports. Preloading one Fredoka and not the rest just moves the reflow. */
export const FONT_WEIGHTS = [400, 500, 600] as const;

/**
 * `crossorigin` is not optional and not cosmetic: fonts are fetched in CORS mode, so a preload
 * without it warms a cache entry the stylesheet then cannot use and the file is fetched twice.
 */
export function buildFontPreloads(hrefs: readonly string[]): HeadTag[] {
  return hrefs.map((href) => ({
    tag: 'link' as const,
    attrs: { rel: 'preload', href, as: 'font', type: 'font/woff2', crossorigin: '' },
  }));
}

/**
 * Speculation rules for the in-site links this page actually carries.
 *
 * The footer is on every page, so from anywhere the reachable set is the home page and the three
 * documents, less whichever one you are reading.
 *
 * Two rules, because they buy different things at very different prices.
 *
 * PREFETCH is eager and covers everything reachable. It fetches the document and nothing else --
 * no scripts, no scene -- so the whole set is four HTML files of about 2.3kB, and it takes the
 * network round trip off the front of every navigation whether or not the visitor hesitated.
 *
 * PRERENDER is `moderate` and covers only the documents. A prerender runs the page for real, so
 * a prerendered document arrives already painted: no blank paper, no font swap, no index
 * dropping in late, because all of that happened before the tap. That also makes it far too
 * expensive to do on spec -- `moderate` starts it on pointerdown on a touchscreen, so a phone
 * never renders three documents nobody opened. A quick tap will not give it long enough to
 * finish, and that is the intended trade: the eager prefetch is what covers the quick tap.
 *
 * The home page is deliberately in the first rule and not the second. Prerendering it would mean
 * standing up a WebGL2 context and the runtime's 2.1MB Wasm heap inside a hidden document that
 * is not being composited; if the context does not come up there, `onLoadError` latches
 * `page--scene-failed` and the visitor gets the flat-sky fallback permanently instead of the
 * scene. Prefetching its HTML is the part of that win which carries no such risk.
 */
export function buildSpeculationRules(path: string): string {
  const docPaths = DOC_ROUTES.map((name) => `/${name}/`);
  const reachable = ['/', ...docPaths].filter((href) => href !== path);
  const prerenderable = docPaths.filter((href) => href !== path);
  const rules: Record<string, unknown[]> = {};

  if (reachable.length > 0) {
    rules.prefetch = [{ where: { href_matches: reachable }, eagerness: 'eager' }];
  }
  if (prerenderable.length > 0) {
    rules.prerender = [{ where: { href_matches: prerenderable }, eagerness: 'moderate' }];
  }

  return JSON.stringify(rules);
}
