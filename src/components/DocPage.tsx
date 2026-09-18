import { useRef } from 'react';
import { useHeadings } from '../hooks/useHeadings';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useZoomLock } from '../hooks/useZoomLock';
import type { Doc } from '../content/doc';
import { COPY } from '../config';
import { DocToc, TOC_RAIL_QUERY } from './DocToc';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/**
 * The shell shared by privacy, terms and support. No Rive canvas, and deliberately no clock
 * either: these pages are paper, the same colour at every hour, declared by data-page="doc" in
 * each document's static HTML. A sky behind a legal document is a background that changes under
 * you while you read it.
 *
 * They are also long: 3,600px on a laptop and 4,800px on a phone. Everything the home page
 * does not need — a brand bar that stays put, a section index, headings that divide the prose
 * into visible sections — exists because of that length, and is scoped to `.page--doc`.
 */
export function DocPage({ doc }: { doc: Doc }) {
  useZoomLock();
  const articleRef = useRef<HTMLElement>(null);
  const { headings, activeId } = useHeadings(articleRef);
  const railFits = useMediaQuery(TOC_RAIL_QUERY);

  return (
    <div className="page page--doc">
      <div className="overlay">
        <SiteHeader isDoc />
        <main className="overlay__main doc">
          {/*
            The masthead is a sibling of the prose rather than its first child, and that is what
            puts the section index in the right place at both widths. In one column the order is
            simply the DOM's -- which page you are on, then how it is laid out, then the prose --
            and in three the grid lifts the index into the margin beside both.
          */}
          <header className="doc__masthead">
            <h1>{doc.title}</h1>
            <p className="doc__updated">{doc.updated}</p>
          </header>
          <DocToc headings={headings} activeId={activeId} open={railFits} />
          <article className="doc__article" ref={articleRef}>
            {doc.body}
            <div className="doc__bottom-back">
              <a className="doc__back" href="/">{`← ${COPY.name}`}</a>
            </div>
          </article>
        </main>
        <SiteFooter currentPath={doc.path} />
      </div>
    </div>
  );
}
