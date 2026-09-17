/**
 * Measures the real contrast of the hero copy in every phase.
 *
 * The hero has no panel: the light that lifts the type off the scene is a text-shadow bonded to
 * the glyphs. That makes "what is the background colour" a genuine question rather than a token
 * lookup — the answer is whatever the halo composited to over that phase's sky, which differs
 * per phase and per pixel.
 *
 * Method: for each phase, set `color: transparent` on the hero text. The glyphs vanish and the
 * shadow stays, so the pixels inside the text's bounding box are exactly the backdrop the glyphs
 * will sit on. Screenshot that box, decode it in a canvas, and take the DARKEST pixel — the worst
 * case for dark ink — then compute the WCAG ratio against --ink.
 *
 *   node scripts/contrast.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4180';
const PHASES = ['night', 'day', 'noon', 'evening'];
const INK = [0x1e, 0x29, 0x3b]; // --ink #1E293B

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'phone-390x844', width: 390, height: 844 },
];

const srgb = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const hex = (px) => `#${px.map((c) => c.toString(16).padStart(2, '0')).join('')}`;

/** Decodes a PNG buffer in a throwaway page and returns the darkest pixel in it. */
async function darkestPixel(decoder, buffer) {
  const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  return decoder.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const lum = (r, g, b) => {
      const s = (c) => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * s(r) + 0.7152 * s(g) + 0.0722 * s(b);
    };
    let best = [255, 255, 255];
    let bestL = 2;
    for (let i = 0; i < data.length; i += 4) {
      const l = lum(data[i], data[i + 1], data[i + 2]);
      if (l < bestL) {
        bestL = l;
        best = [data[i], data[i + 1], data[i + 2]];
      }
    }
    return best;
  }, dataUrl);
}

async function run() {
  await mkdir('screenshots/contrast', { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });

  const decoder = await browser.newPage();
  await decoder.goto('about:blank');
  const rows = [];

  for (const viewport of VIEWPORTS) {
    for (const phase of PHASES) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      await page.goto(`${BASE}/?phase=${phase}`, { waitUntil: 'load' });
      await page.waitForSelector('.scene.is-ready, .page--scene-failed', { timeout: 20_000 });
      await page.waitForTimeout(1600);

      // Hide the glyph fill, keep the shadow: what remains inside the box IS the backdrop.
      await page.addStyleTag({ content: '.hero__title,.hero__subline{color:transparent !important}' });
      await page.waitForTimeout(200);

      for (const [label, selector] of [
        ['title', '.hero__title'],
        ['subline', '.hero__subline'],
      ]) {
        const el = await page.$(selector);
        if (!el) continue;
        const buffer = await el.screenshot();
        const worst = await darkestPixel(decoder, buffer);
        const ratio = contrast(INK, worst);
        // The headline is >= 24px in every viewport here, so it is "large text" at 3:1.
        const required = label === 'title' ? 3 : 4.5;
        rows.push({
          viewport: viewport.name,
          phase,
          element: label,
          backdropWorst: hex(worst),
          ratio: Number(ratio.toFixed(2)),
          required,
          pass: ratio >= required,
        });
      }
      await page.close();
    }
  }

  // The App Store badge is Apple's own artwork and carries its own contrast; it is deliberately
  // not measured here, because it must not be altered whatever a measurement said.

  await decoder.close();
  await browser.close();
  await writeFile('screenshots/contrast/report.json', JSON.stringify(rows, null, 2));

  const pad = (s, n) => String(s).padEnd(n);
  console.log(
    `${pad('viewport', 20)}${pad('phase', 10)}${pad('element', 11)}${pad('worst backdrop', 16)}${pad('ratio', 8)}${pad('need', 6)}result`,
  );
  for (const r of rows) {
    console.log(
      `${pad(r.viewport, 20)}${pad(r.phase, 10)}${pad(r.element, 11)}${pad(r.backdropWorst, 16)}${pad(r.ratio, 8)}${pad(r.required, 6)}${r.pass ? 'PASS' : 'FAIL'}`,
    );
  }
  const failed = rows.filter((r) => !r.pass);
  console.log(`\n${rows.length - failed.length}/${rows.length} pass`);
  if (failed.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
