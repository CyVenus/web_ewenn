import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Doc } from '../content/doc';
import { PRIVACY_DOC } from '../content/privacy';
import { SUPPORT_DOC } from '../content/support';
import { TERMS_DOC } from '../content/terms';
import { slugify } from '../lib/toc';
import { DocPage } from './DocPage';

const DOCS: [string, Doc][] = [
  ['privacy', PRIVACY_DOC],
  ['terms', TERMS_DOC],
  ['support', SUPPORT_DOC],
];

describe.each(DOCS)('%s page', (_name, doc) => {
  it('puts the title and the published date in the masthead', () => {
    const { container } = render(<DocPage doc={doc} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(doc.title);
    expect(container.querySelector('.doc__masthead .doc__updated')).toHaveTextContent(doc.updated);
  });

  it('has exactly one h1 — the shell owns it, the prose does not', () => {
    render(<DocPage doc={doc} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  /**
   * The index is built from the rendered headings rather than from a hand-written list, so this
   * is the test that would catch it drifting from the prose.
   */
  it('indexes every section, and every entry points at a real heading', () => {
    const { container } = render(<DocPage doc={doc} />);
    const headings = Array.from(container.querySelectorAll<HTMLHeadingElement>('.doc__article h2'));
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('.doc__toc-link'));

    expect(headings.length).toBeGreaterThan(1);
    expect(links).toHaveLength(headings.length);

    links.forEach((link, index) => {
      const heading = headings[index]!;
      expect(heading.id).toBeTruthy();
      expect(link.getAttribute('href')).toBe(`#${heading.id}`);
      expect(link).toHaveTextContent(heading.textContent!);
      expect(container.querySelector(`#${CSS.escape(heading.id)}`)).toBe(heading);
    });
  });

  it('derives each heading id from the heading text', () => {
    const { container } = render(<DocPage doc={doc} />);
    const first = container.querySelector<HTMLHeadingElement>('.doc__article h2')!;
    expect(first.id).toBe(slugify(first.textContent!));
  });

  /** One list, one landmark — not a rail plus a separate mobile copy of the same links. */
  it('names the section index once for screen readers', () => {
    render(<DocPage doc={doc} />);
    expect(screen.getAllByRole('navigation', { name: 'On this page' })).toHaveLength(1);
  });

  it('marks its own entry in the footer as the current page', () => {
    const { container } = render(<DocPage doc={doc} />);
    const current = container.querySelectorAll('.site-footer__nav a[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute('href', doc.path);
  });

  it('keeps all three legal links reachable from the footer', () => {
    render(<DocPage doc={doc} />);
    for (const path of ['/privacy/', '/terms/', '/support/']) {
      expect(document.querySelector(`.site-footer__nav a[href="${path}"]`)).toBeInTheDocument();
    }
  });
});

describe('section index', () => {
  it('is not rendered for a document with nothing to index', () => {
    const doc: Doc = {
      title: 'Short',
      description: 'A document with a single section.',
      updated: 'Last updated 30 August 2026',
      path: '/privacy/',
      body: (
        <>
          <h2>Only section</h2>
          <p>One paragraph.</p>
        </>
      ),
    };
    const { container } = render(<DocPage doc={doc} />);
    expect(container.querySelector('.doc__toc')).toBeNull();
  });
});
