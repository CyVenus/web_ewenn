import { useEffect } from 'react';
import { installZoomLock } from '../lib/zoomLock';

/**
 * Holds the page at the size it loaded at. See lib/zoomLock.ts for what that can and cannot mean.
 *
 * Mounted by the two page shells rather than by each entry point, and first among their hooks:
 * useViewportArtboard reads the design viewport the lock publishes, and installing the lock ahead
 * of it means the first `resize` of a zoom is already counter-scaled by the time it is read.
 */
export function useZoomLock(): void {
  useEffect(() => installZoomLock(window), []);
}
