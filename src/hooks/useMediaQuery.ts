import { useEffect, useState } from 'react';

/**
 * Subscribes to a CSS media query.
 *
 * Extracted from useReducedMotion, which now calls it: the table-of-contents rail needs the same
 * "is this breakpoint active" answer in JS, because a `<details>` cannot be forced open by CSS
 * alone. Read the query once for the first render so there is no flash of the wrong state.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const onChange = () => setMatches(mediaQuery.matches);
    onChange();
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
