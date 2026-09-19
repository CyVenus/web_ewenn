import badgeUrl from '../assets/app-store-badge.svg';
import { APP_STORE_URL } from '../config';

/**
 * Apple's official badge artwork, unmodified — no recolouring, no transform, no animation, and
 * no hover effect on the image itself. The padding in CSS is the required clear space of at
 * least a quarter of the badge height; the artwork never gets a background of its own.
 *
 * Opens the App Store link in a new tab when clicked.
 */
export function AppStoreBadge() {
  const artwork = <img className="store-badge__img" src={badgeUrl} alt="" width={204} height={68} />;

  if (!APP_STORE_URL) {
    return (
      <span className="store-badge store-badge--pending" role="img" aria-label="Ewenn is coming soon to the App Store">
        {artwork}
      </span>
    );
  }

  return (
    <a
      className="store-badge"
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Download Ewenn on the App Store"
    >
      {artwork}
    </a>
  );
}
