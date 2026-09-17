import { COPY, HEADLINE } from '../config';
import { AppStoreBadge } from './AppStoreBadge';

/**
 * The one block of copy on the site. It carries its own light rather than sitting on a panel —
 * see .hero__title in global.css for why a rectangle here is the wrong answer.
 */
export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__card">
        <h1 id="hero-title" className="hero__title">
          {HEADLINE.lead}
          <span className="hero__title-phrase">{HEADLINE.phrase}</span>
        </h1>
        <p className="hero__subline">{COPY.subline}</p>
        <AppStoreBadge />
      </div>
    </section>
  );
}
