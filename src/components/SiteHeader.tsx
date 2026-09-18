import logoUrl from '../assets/app-logo.svg';
import { COPY } from '../config';

/**
 * The logo is decorative (`alt=""`): the wordmark beside it already says "Ewenn", and a screen
 * reader announcing the name twice is noise. The square artwork gets an iOS-style corner radius
 * so it reads as the app icon it is.
 */
export type SiteHeaderProps = {
  /** If true, renders with a back arrow and back-to-home accessibility label for document pages. */
  isDoc?: boolean;
};

export function SiteHeader({ isDoc }: SiteHeaderProps = {}) {
  return (
    <header className="site-header enter">
      <a
        className={isDoc ? 'brand brand--back' : 'brand'}
        href="/"
        aria-label={isDoc ? `Back to ${COPY.name} home` : COPY.name}
      >
        {isDoc && (
          <span className="brand__back-arrow" aria-hidden="true">
            ←
          </span>
        )}
        <img className="brand__icon" src={logoUrl} alt="" width={48} height={48} />
        <span className="brand__name">{COPY.name}</span>
      </a>
    </header>
  );
}
