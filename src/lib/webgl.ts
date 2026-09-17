export function supportsWebGL2(): boolean {
  try {
    const context = document.createElement('canvas').getContext('webgl2');
    // Browsers cap live WebGL contexts, so release the probe's now instead of waiting for garbage collection.
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(context);
  } catch {
    return false;
  }
}
