import { usePhase } from '../hooks/usePhase';
import type { Doc } from '../content/doc';
import { COPY } from '../config';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/**
 * The shell shared by privacy, terms and support. No Rive canvas — these are pages to read —
 * but usePhase still runs so the sky behind the card matches the home page at the same hour.
 */
export function DocPage({ doc }: { doc: Doc }) {
  usePhase();

  return (
    <div className="page page--doc">
      <div className="overlay">
        <SiteHeader />
        <main className="overlay__main doc">
          <article className="doc__article">
            <a className="doc__back" href="/">{`\u2190 ${COPY.name}`}</a>
            <h1>{doc.title}</h1>
            <p className="doc__updated">{doc.updated}</p>
            {doc.body}
          </article>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
