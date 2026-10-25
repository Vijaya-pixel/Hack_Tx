// Renders every screen at 1440 and 390 wide plus the design system page to PNGs.
// Usage: npm run dev (in another terminal), then: npm run shots [-- outDir] [-- only=key1,key2]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const out = process.argv.find((a) => !a.startsWith('only=') && a !== process.argv[0] && a !== process.argv[1]) ?? 'shots';
const only = process.argv.find((a) => a.startsWith('only='))?.slice(5).split(',');
const KEYS = ['welcome', 'about', 'reveal', 'basecamp', 'scout', 'odds', 'flag', 'flag-signed', 'flag-tampered', 'health', 'stamp', 'stamp-after', 'basecamp-empty', 'states'];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/local/bin/google-chrome', args: ['--no-sandbox'] });
const shoot = async (path, file, width) => {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await page.goto(`${BASE}/#/${path}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${file}.png`, fullPage: true });
  await page.close();
  console.log('wrote', file);
};
for (const k of KEYS) {
  if (only && !only.includes(k)) continue;
  await shoot(`screen/${k}/desktop`, `desktop-${k}`, 1440);
  await shoot(`screen/${k}/mobile`, `mobile-${k}`, 390);
}
if (!only || only.includes('system')) await shoot('system', 'design-system', 1440);
await browser.close();
