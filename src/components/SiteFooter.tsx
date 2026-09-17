import { COPY } from '../config';

/**
 * No controls of any kind. Playback follows `prefers-reduced-motion` alone, so a pause toggle
 * would be a second, contradictory source of truth for the same thing.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer enter">
      <p className="site-footer__copy">{`\u00A9 ${new Date().getFullYear()} ${COPY.name}`}</p>
      <nav className="site-footer__nav" aria-label="Legal">
        <a href="/privacy/">Privacy Policy</a>
        <a href="/terms/">Terms of Use</a>
        <a href="/support/">Support</a>
      </nav>
    </footer>
  );
}
