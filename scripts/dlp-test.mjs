import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const OUT = path.resolve('.playwright-mcp');
fs.mkdirSync(OUT, { recursive: true });
const LOG = path.join(OUT, 'dlp-test-log.txt');
const results = [];
const log = (m) => { results.push(m); fs.appendFileSync(LOG, m + '\n'); };

const profile = path.join(os.tmpdir(), 'noska-dlp-profile-' + Date.now());
const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chrome',
  headless: false,
  viewport: { width: 1440, height: 900 },
  args: ['--window-size=1460,980', '--window-position=40,40'],
});

const page = ctx.pages()[0] || await ctx.newPage();
const consoleErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 220)); });
page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + String(err).slice(0, 220)));

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
];

await page.goto('http://127.0.0.1:5173/download', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

for (const vp of VIEWPORTS) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  const overflow = await page.evaluate(() => {
    const d = document.documentElement;
    return { scrollW: d.scrollWidth, innerW: window.innerWidth, overflowX: d.scrollWidth > window.innerWidth + 1 };
  });

  const heroVisible = await page.locator('.dlp-hero-paper').isVisible().catch(() => false);
  const cards = await page.locator('.dlp-card').count();
  const dockVisible = await page.locator('.dlp-dock').isVisible().catch(() => false);

  await page.screenshot({ path: path.join(OUT, `dlp-${vp.name}-hero.png`) });

  await page.evaluate(() => document.querySelector('#get')?.scrollIntoView({ behavior: 'instant', block: 'start' }));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, `dlp-${vp.name}-cards.png`) });

  if (vp.name === 'desktop') {
    await page.locator('.dlp-seg button').nth(1).click();
    await page.waitForTimeout(400);
    const macChip = await page.locator('.dlp-card').nth(1).locator('.dlp-meta li').nth(2).innerText();
    log(`INTERACTION mac-arch-toggle -> "${macChip.replace(/\s+/g, ' ')}"`);
    await page.locator('.dlp-seg').nth(1).locator('button').nth(2).click();
    await page.waitForTimeout(400);
    const linuxBtn = await page.locator('.dlp-card').nth(2).locator('.dlp-pill-btn').innerText();
    log(`INTERACTION linux-format-rpm -> "${linuxBtn.trim()}"`);
    await page.locator('.dlp-seg button').first().click();
    await page.locator('.dlp-seg').nth(1).locator('button').first().click();
  }

  const faqOk = await page.evaluate(() => !!document.querySelector('.dlp-faq'));

  log(`${vp.name}: overflowX=${overflow.overflowX} (${overflow.scrollW} vs ${overflow.innerW}) hero=${heroVisible} cards=${cards} dock=${dockVisible} faq=${faqOk}`);

  if (vp.name === 'mobile') {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, 'dlp-mobile-full.png'), fullPage: true });
  }
  if (vp.name === 'desktop') {
    await page.screenshot({ path: path.join(OUT, 'dlp-desktop-full.png'), fullPage: true });
  }
}

log('CONSOLE_ERRORS=' + consoleErrors.length);
consoleErrors.slice(0, 6).forEach((e) => log('  ' + e));

log('DONE');
fs.writeFileSync(path.join(OUT, 'dlp-test-log.txt'), results.join('\n'));
