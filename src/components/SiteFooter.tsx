import { COPY } from '../config';

const LEGAL_LINKS = [
  { href: '/privacy/', label: 'Privacy Policy' },
  { href: '/terms/', label: 'Terms of Use' },
  { href: '/support/', label: 'Support' },
] as const;

export type SiteFooterProps = {
  /** The document being read, so its own entry can be marked. Omitted on the home page. */
  currentPath?: string;
};

/**
 * No controls of any kind. Playback follows `prefers-reduced-motion` alone, so a pause toggle
 * would be a second, contradictory source of truth for the same thing.
 *
 * The current document keeps its href and its accessible name and is marked with
 * `aria-current="page"`: a link to the page you are on is a normal thing for a footer to carry,
 * and stripping it would leave the row a word short on one page out of three.
 */
export function SiteFooter({ currentPath }: SiteFooterProps = {}) {
  return (
    <footer className="site-footer enter">
      <p className="site-footer__copy">{`© ${new Date().getFullYear()} ${COPY.name}`}</p>
      <nav className="site-footer__nav" aria-label="Legal">
        {LEGAL_LINKS.map(({ href, label }) => {
          const current = href === currentPath;
          return (
            <a
              key={href}
              href={href}
              className={current ? 'is-current' : undefined}
              aria-current={current ? 'page' : undefined}
            >
              {label}
            </a>
          );
        })}
      </nav>
    </footer>
  );
}
