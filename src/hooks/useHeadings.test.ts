import { describe, expect, it } from 'vitest';
import { pickActive } from './useHeadings';

const IDS = ['one', 'two', 'three', 'four'];
/** A viewport with room left to scroll, so the end-of-document rule does not apply. */
const MIDWAY = { height: 900, scrollY: 1000, documentHeight: 6000 };

describe('pickActive', () => {
  it('is the first section before anything has scrolled past the band', () => {
    expect(pickActive([40, 900, 1800, 2700], IDS, MIDWAY)).toBe('one');
  });

  it('is the lowest heading that has travelled into the band', () => {
    // The band is 30% of 900 = 270px.
    expect(pickActive([-800, 100, 1000, 2000], IDS, MIDWAY)).toBe('two');
    expect(pickActive([-1800, -900, 260, 1200], IDS, MIDWAY)).toBe('three');
  });

  /** The middle of a long section: nothing is near the band, and the answer must not go blank. */
  it('holds the section you are inside when no heading is near the band', () => {
    expect(pickActive([-2400, -1600, -700, 1400], IDS, MIDWAY)).toBe('three');
  });

  it('never returns a heading that is still below the band', () => {
    expect(pickActive([271, 900, 1800, 2700], IDS, MIDWAY)).toBe('one');
  });

  /*
   * The case an IntersectionObserver could not express. A page stops scrolling with a whole
   * screenful still showing, so the last headings never reach the band -- and the index used to
   * sit lighting a section three above the one being read.
   */
  it('marks the last heading on screen once the document has run out of scroll', () => {
    const atEnd = { height: 900, scrollY: 5100, documentHeight: 6000 };
    expect(pickActive([-1400, -700, 300, 620], IDS, atEnd)).toBe('four');
  });

  it('ignores headings that are off the bottom even at the end of the document', () => {
    const atEnd = { height: 900, scrollY: 5100, documentHeight: 6000 };
    expect(pickActive([-1400, -700, 300, 1500], IDS, atEnd)).toBe('three');
  });

  it('has no answer for a document with no sections', () => {
    expect(pickActive([], [], MIDWAY)).toBeNull();
  });
});
