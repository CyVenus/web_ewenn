import { isLiveAppStoreId } from '../config';

export type HeadTag = { tag: 'meta' | 'link'; attrs: Record<string, string> };

/**
 * `path` is the page's own canonical path, so each document points at itself. Every page
 * used to receive `canonical: /`, which was inert only because SITE_URL was empty -- with
 * an origin set it would have told search engines that the privacy policy was the home page.
 */
export function buildHeadTags({
  siteUrl,
  appStoreId,
  path,
}: {
  siteUrl: string;
  appStoreId: string;
  path: string;
}): HeadTag[] {
  const origin = siteUrl.replace(/\/+$/, '');
  const tags: HeadTag[] = [
    { tag: 'meta', attrs: { property: 'og:image', content: `${origin}/og-image.png` } },
    { tag: 'meta', attrs: { name: 'twitter:image', content: `${origin}/og-image.png` } },
  ];
  if (origin) {
    tags.push({ tag: 'link', attrs: { rel: 'canonical', href: `${origin}${path}` } });
    tags.push({ tag: 'meta', attrs: { property: 'og:url', content: `${origin}${path}` } });
  }
  if (isLiveAppStoreId(appStoreId)) {
    tags.push({ tag: 'meta', attrs: { name: 'apple-itunes-app', content: `app-id=${appStoreId}` } });
  }
  return tags;
}
