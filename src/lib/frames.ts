/** Runs `callback` after `count` animation frames. Returns a cancel function. */
export function afterFrames(count: number, callback: () => void): () => void {
  let remaining = count;
  let handle = 0;
  const tick = () => {
    remaining -= 1;
    if (remaining <= 0) {
      callback();
    } else {
      handle = requestAnimationFrame(tick);
    }
  };
  handle = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(handle);
}
