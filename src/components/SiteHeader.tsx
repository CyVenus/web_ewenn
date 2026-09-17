import logoUrl from '../assets/app-logo.svg';
import { COPY } from '../config';

/**
 * The logo is decorative (`alt=""`): the wordmark beside it already says "Ewenn", and a screen
 * reader announcing the name twice is noise. The square artwork gets an iOS-style corner radius
 * so it reads as the app icon it is.
 */
export function SiteHeader() {
  return (
    <header className="site-header enter">
      <a className="brand" href="/">
        <img className="brand__icon" src={logoUrl} alt="" width={48} height={48} />
        <span className="brand__name">{COPY.name}</span>
      </a>
    </header>
  );
}
