import badgeUrl from '../assets/app-store-badge.svg';
import { APP_STORE_LIVE, APP_STORE_URL } from '../config';

/**
 * Apple's official badge artwork, unmodified — no recolouring, no transform, no animation, and
 * no hover effect on the image itself. The padding in CSS is the required clear space of at
 * least a quarter of the badge height; the artwork never gets a background of its own.
 *
 * `APP_STORE_ID` gates only whether the badge is a LINK. Before the app is listed there is
 * nowhere legitimate to send anyone, so it renders as an image with its own accessible name
 * rather than an anchor to a URL that would 404 — a dead download promise is worse than a
 * patient one. Setting the ID turns this into a real link and, through the same constant in
 * lib/headTags, switches on the Smart App Banner. The two can never disagree.
 *
 * Deliberately never a <button>: there is nothing here to press.
 */
export function AppStoreBadge() {
  const artwork = <img className="store-badge__img" src={badgeUrl} alt="" width={204} height={68} />;

  if (!APP_STORE_LIVE) {
    return (
      <span className="store-badge store-badge--pending" role="img" aria-label="Ewenn is coming soon to the App Store">
        {artwork}
      </span>
    );
  }

  return (
    <a className="store-badge" href={APP_STORE_URL} aria-label="Download Ewenn on the App Store">
      {artwork}
    </a>
  );
}
