import { useEffect, useState, type RefObject } from 'react';
import { uniqueSlugs } from '../lib/toc';

export type Heading = { id: string; title: string };

/**
 * How far down the viewport a heading has to have travelled before it counts as the section you
 * are reading. Anything lower is a section you are only approaching, and lighting it early makes
 * the index feel like it is guessing.
 */
export const READING_BAND = 0.3;

/** The id of the section being read, given where every heading currently sits. */
export function pickActive(
  tops: readonly number[],
  ids: readonly string[],
  view: { height: number; scrollY: number; documentHeight: number },
): string | null {
  if (ids.length === 0) return null;
  let current = ids[0]!;
  const band = view.height * READING_BAND;
  for (let i = 0; i < tops.length; i += 1) {
    if (tops[i]! > band) break;
    current = ids[i]!;
  }
  /*
   * The end of the document is its own case. A page stops scrolling with its last screenful still
   * on screen, so the final sections never reach the band however far down you go -- on the
   * privacy page the last three cannot -- and the index would sit lighting "How long we keep
   * things" while you read Contact. Once there is no scroll left, the lowest heading actually on
   * screen is the one you are reading.
   */
  if (view.scrollY + view.height >= view.documentHeight - 2) {
    for (let i = 0; i < tops.length; i += 1) {
      if (tops[i]! < view.height) current = ids[i]!;
    }
  }
  return current;
}

/**
 * Reads the `h2`s inside `ref`, gives each one an id, and tracks which is currently being read.
 *
 * Works on the rendered DOM rather than on the JSX, so the legal documents stay plain prose --
 * see `src/lib/toc.ts`. Assigning ids is idempotent, which is what makes StrictMode's double
 * effect harmless.
 */
export function useHeadings(ref: RefObject<HTMLElement | null>): {
  headings: Heading[];
  activeId: string | null;
} {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const elements = Array.from(root.querySelectorAll('h2'));
    const slugs = uniqueSlugs(elements.map((element) => element.textContent ?? ''));
    elements.forEach((element, index) => {
      element.id = slugs[index]!;
    });

    setHeadings(elements.map((element, index) => ({ id: slugs[index]!, title: element.textContent ?? '' })));

    let cancelled = false;
    /*
     * Where a link put the reader, and which section it named. A section in the last screenful of
     * a document cannot be scrolled to the top -- the page runs out of scroll first -- so arriving
     * at #children leaves exactly the scroll position of having read to the end, and measuring it
     * answers "Contact" to a link that said "Children". The link knows which was meant, so its
     * answer stands until the reader moves off the spot it landed on.
     */
    let pinned: { id: string; scrollY: number } | null = null;

    const update = () => {
      if (cancelled) return;
      if (pinned && Math.abs(window.scrollY - pinned.scrollY) < 2) {
        setActiveId(pinned.id);
        return;
      }
      pinned = null;
      setActiveId(
        pickActive(
          elements.map((element) => element.getBoundingClientRect().top),
          slugs,
          {
            height: window.innerHeight,
            scrollY: window.scrollY,
            documentHeight: document.documentElement.scrollHeight,
          },
        ),
      );
    };

    // The page is client-rendered, so a link arriving at /privacy/#children finds no such element
    // at load. The ids exist as of the loop above, which is the first moment the browser could
    // honour it -- but not the right one: Fredoka is still loading, and scrolling before it swaps
    // in lands a few hundred pixels off once the prose reflows. So wait for the fonts.
    const target = window.location.hash.slice(1);
    const jump = () => {
      // `instant`, and it has to be that word: `auto` does not mean "no animation", it means "use
      // the element's computed scroll-behavior", which this stylesheet sets to smooth. Smooth is
      // right for an index entry clicked while reading; for a link that ARRIVES at a section it
      // would mean watching a 3,000px flight through a document nobody asked to see.
      if (cancelled) return;
      document.getElementById(target)?.scrollIntoView({ behavior: 'instant' });
      pinned = { id: target, scrollY: window.scrollY };
      setActiveId(target);
    };
    if (target && slugs.includes(target)) {
      if (document.fonts) void document.fonts.ready.then(jump);
      else jump();
    }

    /*
     * Position, recomputed on scroll, rather than an IntersectionObserver. An observer reports
     * only when a heading CROSSES the band, which leaves two states it cannot describe: the
     * middle of a long section, where nothing has crossed anything, and the foot of the document,
     * where the remaining headings never cross at all. Both are answered by simply asking where
     * the headings are, and over a dozen elements once a frame that costs nothing.
     */
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ref]);

  return { headings, activeId };
}
