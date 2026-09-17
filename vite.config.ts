import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import type { Plugin, ResolvedConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import { APP_STORE_ID, SITE_URL } from './src/config';
import { buildHeadTags } from './src/lib/headTags';
import { PHASE_SCHEDULE } from './src/lib/phase';
import { buildPrePaintScript } from './src/lib/prepaint';
import { DOC_ROUTES, canonicalPath, docAliases } from './src/lib/routes';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * The pre-paint script must run before anything paints, so it is injected head-prepend rather
 * than written into each HTML file — four copies of the same script would drift.
 */
function ewennHead(): Plugin {
  return {
    name: 'ewenn-head',
    transformIndexHtml: {
      order: 'pre',
      handler: (_html, ctx) => [
        { tag: 'script', children: buildPrePaintScript(PHASE_SCHEDULE), injectTo: 'head-prepend' as const },
        ...buildHeadTags({
          siteUrl: SITE_URL,
          appStoreId: APP_STORE_ID,
          path: canonicalPath(ctx.path),
        }).map((headTag) => ({
          tag: headTag.tag,
          attrs: headTag.attrs,
          injectTo: 'head' as const,
        })),
      ],
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
  plugins: [react(), ewennHead(), ewennDocAliases()],
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
