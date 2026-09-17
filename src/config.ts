// PLACEHOLDER: the numeric App Store ID, e.g. '1234567890'. Empty means the app is not listed
// yet: Apple's badge still renders, but as an image rather than a link, and no Smart App Banner
// tag is emitted. Filling this in is the only edit launch needs.
export const APP_STORE_ID = '';

/**
 * The badge and the `apple-itunes-app` meta tag must never disagree about whether the app is
 * live, so both ask this one predicate rather than each testing the ID themselves.
 */
export const isLiveAppStoreId = (id: string): boolean => /^\d+$/.test(id);

export const APP_STORE_LIVE = isLiveAppStoreId(APP_STORE_ID);

export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;

/** The public origin. Feeds each page's canonical and og:url, and the absolute share-image URL. */
export const SITE_URL = 'https://ewenn.app';

export const COPY = {
  name: 'Ewenn',
  headline: 'Your new self-care partner.',
  subline: 'Set goals, build gentle AI routines and make daily progress with the penguin by your side.',
} as const;

/**
 * `text-wrap: balance` breaks the headline at the hyphen — "Your new self-" / "care partner." —
 * because that split has the shorter longest line, so balance actively prefers it. A max-width
 * cannot fix it either: "Your new self-" is narrower than "self-care partner.", so any box that
 * fits the line we want also fits the break we don't. Marking the hyphenated phrase unbreakable
 * in the markup is the one fix that leaves COPY.headline byte-identical on the page and in the
 * clipboard.
 */
function splitAtHyphenatedPhrase(headline: string): { lead: string; phrase: string } {
  const words = headline.split(' ');
  const index = words.findIndex((word) => word.includes('-'));
  if (index <= 0) return { lead: '', phrase: headline };
  return { lead: `${words.slice(0, index).join(' ')} `, phrase: words.slice(index).join(' ') };
}

export const HEADLINE = splitAtHyphenatedPhrase(COPY.headline);

export const RIVE_SRC = '/rive/ewenn-scene.riv';
export const RIVE_STATE_MACHINE = 'State Machine 1';
export const DESKTOP_ARTBOARD = 'site-desktop';
export const MOBILE_ARTBOARD = 'site-mobile';

/** Below this width/height ratio the portrait artboard is the right composition. */
export const PORTRAIT_MAX_ASPECT = 0.75;
