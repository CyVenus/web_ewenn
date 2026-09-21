import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import type { IndexHtmlTransformContext, Plugin, ResolvedConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import { APP_STORE_ID, SITE_URL } from './src/config.ts';
import { buildHeadTags } from './src/lib/headTags.ts';
import { PHASE_SCHEDULE } from './src/lib/phase.ts';
import { buildPrePaintScript } from './src/lib/prepaint.ts';
import { DOC_ROUTES, canonicalPath, docAliases } from './src/lib/routes.ts';
import { buildFontPreloads, buildSpeculationRules, buildWasmPreload, fontPreloadWeights } from './src/lib/warmup.ts';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * The URLs of the three Fredoka weights, as the page will actually request them.
 *
 * A preload has to name the same URL the stylesheet does or it warms a second cache entry and
 * the file is fetched twice, so neither side of this is hardcoded: in a build the names carry
 * content hashes and are read back out of the bundle, and in dev they are the unhashed paths
 * Vite serves straight out of node_modules. A weight that cannot be found is simply left out —
 * a missing preload costs a reflow, a wrong one costs a duplicate download.
 */
function fontPreloadHrefs(bundle: IndexHtmlTransformContext['bundle'], path: string): string[] {
  return fontPreloadWeights(path).flatMap((weight) => {
    const stem = `fredoka-latin-${weight}-normal`;
    if (!bundle) return [`/node_modules/@fontsource/fredoka/files/${stem}.woff2`];
    const name = Object.keys(bundle).find(
      (key) => key.includes(stem) && key.endsWith('.woff2'),
    );
    return name ? [`/${name}`] : [];
  });
}

/**
 * The Rive runtime's hashed Wasm URL, as the built page will request it. Only the primary build
 * — not `rive_fallback`, which is fetched only when the first fails. Null in dev, where Vite
 * serves it unhashed out of node_modules and there is no download worth racing.
 */
function wasmPreloadHref(bundle: IndexHtmlTransformContext['bundle']): string | null {
  if (!bundle) return null;
  const name = Object.keys(bundle).find((key) => /(^|\/)rive-[^/]*\.wasm$/.test(key));
  return name ? `/${name}` : null;
}

/**
 * The pre-paint script must run before anything paints, so it is injected head-prepend rather
 * than written into each HTML file — four copies of the same script would drift. The warm-up
 * tags below are here for the same reason, and because two of the three depend on which page
 * is being built.
 */
function ewennHead(): Plugin {
  return {
    name: 'ewenn-head',
    transformIndexHtml: {
      order: 'pre',
      handler: (_html, ctx) => {
        const path = canonicalPath(ctx.path);
        return [
          { tag: 'script', children: buildPrePaintScript(PHASE_SCHEDULE), injectTo: 'head-prepend' as const },
          /*
           * Fonts first, and above the speculation rules on purpose. This page's own reflow is
           * worth more than a head start on the next one, and the order tags appear in the head
           * is the order the browser discovers them in.
           */
          ...buildFontPreloads(fontPreloadHrefs(ctx.bundle, path)).map((headTag) => ({
            tag: headTag.tag,
            attrs: headTag.attrs,
            injectTo: 'head' as const,
          })),
          {
            tag: 'script',
            attrs: { type: 'speculationrules' },
            children: buildSpeculationRules(path),
            injectTo: 'head' as const,
          },
          ...buildHeadTags({
            siteUrl: SITE_URL,
            appStoreId: APP_STORE_ID,
            path,
          }).map((headTag) => ({
            tag: headTag.tag,
            attrs: headTag.attrs,
            injectTo: 'head' as const,
          })),
        ];
      },
    },
  };
}

/**
 * The Wasm preload needs its own hook, ordered `post`: the home page's `pre` transform runs
 * before the bundle exists, so the hashed name is not there to read yet — measured, the `pre`
 * context for index.html has no bundle at all. `post` runs once the asset has been emitted.
 */
function ewennWasmPreload(): Plugin {
  return {
    name: 'ewenn-wasm-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (_html, ctx) =>
        buildWasmPreload(wasmPreloadHref(ctx.bundle), canonicalPath(ctx.path)).map((headTag) => ({
          tag: headTag.tag,
          attrs: headTag.attrs,
          injectTo: 'head' as const,
        })),
    },
  };
}

/**
 * Copies each built document to the `.html` URL the published site already serves it at, so the
 * links baked into App Store Connect, the Rewenn products and the app binary keep resolving.
 * Asset URLs in the output are absolute, so a byte copy is a correct page.
 */
function ewennDocAliases(): Plugin {
  let resolved: ResolvedConfig;
  return {
    name: 'ewenn-doc-aliases',
    apply: 'build',
    configResolved(config) {
      resolved = config;
    },
    async closeBundle() {
      const outDir = join(resolved.root, resolved.build.outDir);
      await Promise.all(
        docAliases().map(({ from, to }) => copyFile(join(outDir, from), join(outDir, to))),
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), ewennHead(), ewennWasmPreload(), ewennDocAliases()],
  build: {
    rollupOptions: {
      input: {
        main: fromRoot('./index.html'),
        ...Object.fromEntries(DOC_ROUTES.map((name) => [name, fromRoot(`./${name}/index.html`)])),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
