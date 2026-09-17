/** The long-form documents. Each is built from `<name>/index.html` and served at `/<name>/`. */
export const DOC_ROUTES = ['privacy', 'terms', 'support'] as const;

/**
 * The canonical URL path for an HTML entry, from either a build filename or a dev request.
 * `privacy/index.html` and `/privacy/` both give `/privacy/`; `index.html` gives `/`.
 */
export function canonicalPath(entry: string): string {
  const path = entry.split('?')[0]!.replace(/^\/+/, '').replace(/index\.html$/, '');
  return `/${path}`;
}

/**
 * The published `.html` aliases, as paths inside the build output.
 *
 * App Store Connect's app record, both Rewenn subscription products and the paywall
 * inside the binary point at `/privacy.html` and `/terms.html`. Those URLs were chosen to
 * be permanent -- and `cleanUrls` is off on purpose, so nothing rewrites them -- which
 * means this site cannot take over the domain without still answering them. The build
 * copies each document to its old path; the copy carries a canonical link back to the
 * directory URL, so search engines see one page rather than two.
 */
export function docAliases(): { from: string; to: string }[] {
  return DOC_ROUTES.map((name) => ({ from: `${name}/index.html`, to: `${name}.html` }));
}
