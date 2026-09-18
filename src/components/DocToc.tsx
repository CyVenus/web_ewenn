import type { Heading } from '../hooks/useHeadings';

/**
 * The width at which the index has a margin of its own to live in — wide enough for the index,
 * the prose and an empty column the index's width, so the prose stays centred. Mirrored in
 * global.css, where the same number opens the three-column grid.
 */
export const TOC_RAIL_QUERY = '(min-width: 1280px)';

export type DocTocProps = {
  headings: Heading[];
  activeId: string | null;
  /** True at the rail breakpoint. A `<details>` cannot be forced open by CSS, so this comes from JS. */
  open: boolean;
};

/**
 * The section index for a long document.
 *
 * One element in both layouts rather than a rail and a separate mobile list: two would put two
 * navigation landmarks in the accessibility tree describing the same thing. At the rail
 * breakpoint it is held open and its summary is hidden by CSS; below it, it is an ordinary
 * closed `<details>` above the article — which is where a 4,800px phone page needs it most.
 *
 * Nothing is rendered for a document with fewer than two sections: an index of one is furniture.
 */
export function DocToc({ headings, activeId, open }: DocTocProps) {
  if (headings.length < 2) return null;

  return (
    <details className="doc__toc" open={open}>
      <summary className="doc__toc-summary">On this page</summary>
      <nav className="doc__toc-nav" aria-label="On this page">
        {/* The rail's own label, for the breakpoint where the summary above is hidden. Hidden from
            assistive technology because the nav it sits in is already named the same thing. */}
        <p className="doc__toc-title" aria-hidden="true">
          On this page
        </p>
        <ol className="doc__toc-list">
          {headings.map((heading) => {
            const current = heading.id === activeId;
            return (
              <li key={heading.id}>
                <a
                  className={current ? 'doc__toc-link is-current' : 'doc__toc-link'}
                  href={`#${heading.id}`}
                  aria-current={current ? 'true' : undefined}
                >
                  {heading.title}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
    </details>
  );
}
