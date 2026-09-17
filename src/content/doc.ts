import type { ReactNode } from 'react';

/**
 * A long-form document page. Privacy and Terms are transcribed verbatim from the
 * published ewenn.app pages, so `updated` is the date those documents carry and not
 * the date this file changed -- editing the prose means editing the date with it.
 */
export type Doc = {
  /** The single h1, and the stem of the document's <title>. */
  title: string;
  /** The meta description on the document's HTML entry. */
  description: string;
  /** Printed under the title, exactly as the published document states it. */
  updated: string;
  /** The canonical directory URL. The `.html` alias points here (see lib/docAliases). */
  path: string;
  body: ReactNode;
};
