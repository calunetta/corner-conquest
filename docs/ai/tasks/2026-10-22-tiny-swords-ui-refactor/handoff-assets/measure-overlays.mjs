import { chromium } from '/Users/clunetta/Documents/Games/Corner Conquest/node_modules/@playwright/test/index.mjs';
import fs from 'fs';
const out = process.argv[2];
const B = 'http://localhost:9002';
const rect = (el) => { const r = el.getBoundingClientRect(); return { w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
const res = {};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; page.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,120)); });
// beacon popovers
await page.goto(`${B}/testbed/hud-tutorial-beacon?state=Default`, { waitUntil: 'networkidle' });
for (const id of ['map-info','player-info']) {
  await page.getByTestId(`tutorial-beacon-${id}`).click();
  await page.waitForSelector('[data-radix-popper-content-wrapper] [role=dialog]');
  await page.waitForTimeout(500);
  res[`beacon-popover-${id}`] = await page.locator('[role=dialog]').first().evaluate(rect);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
}
// lobby row
await page.goto(`${B}/testbed/lobby-game-row?state=Open%20room`, { waitUntil: 'networkidle' });
const btn = page.locator('button[aria-haspopup=dialog]').first();
await btn.click(); await page.waitForTimeout(500);
res['lobby-popover'] = await page.locator('[role=dialog]').first().evaluate(rect);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
const av = page.locator('span.rounded-full, [class*=avatar], span:has(> span)').first();
const avatar = page.locator('[class*="h-8"][class*="w-8"]').first();
await avatar.hover(); await page.waitForSelector('[role=tooltip]', { timeout: 3000 }).catch(()=>{});
await page.waitForTimeout(400);
res['lobby-tooltip'] = await page.locator('[data-radix-popper-content-wrapper] > [data-side]').first().evaluate(rect).catch(()=>null);
// tabs + toast on temp page
await page.goto(`${B}/tmp-overlays`, { waitUntil: 'networkidle' });
res['tabs-list'] = await page.getByTestId('tabs-list').evaluate(rect);
res['tabs-triggers'] = await page.locator('[role=tab]').evaluateAll(els => els.map(e => { const r=e.getBoundingClientRect(); return {w:+r.width.toFixed(2),h:+r.height.toFixed(2)}; }));
res['toast-default'] = await page.getByTestId('toast-default').evaluate(rect);
res['toast-destructive'] = await page.getByTestId('toast-destructive').evaluate(rect);
res['toast-action'] = await page.locator('[data-testid=toast-default] button').first().evaluate(rect);
res['_consoleErrors'] = [...new Set(errs)];
fs.writeFileSync(out, JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 2));
await browser.close();
