import { chromium } from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2];
const pages = ['hud-actions-panel', 'hud-game-board-header'];
const firstState = { 'hud-actions-panel': 'My turn, no selection', 'hud-game-board-header': 'Waiting – host, can start' };
const vps = { desktop: { width: 1280, height: 720 }, mobile: { width: 390, height: 844 } };
const res = {};
const b = await chromium.launch();
for (const [vn, vp] of Object.entries(vps)) {
  const ctx = await b.newContext({ viewport: vp });
  const p = await ctx.newPage();
  for (const slug of pages) {
    await p.goto(`http://localhost:9002/testbed/${slug}?state=${encodeURIComponent(firstState[slug])}`, { waitUntil: 'networkidle', timeout: 120000 });
    await p.waitForTimeout(3000);
    res[`${slug}@${vn}`] = await p.$$eval('button', (els) => els.map((e) => {
      const r = e.getBoundingClientRect();
      return { testid: e.getAttribute('data-testid'), text: (e.textContent || '').trim().slice(0, 30), w: r.width, h: r.height, x: r.x, y: r.y };
    }));
    if (vn === 'desktop') await p.screenshot({ path: out.replace('.json', `-${slug}.png`) });
  }
  await ctx.close();
}
await b.close();
fs.writeFileSync(out, JSON.stringify(res, null, 1));
for (const k in res) console.log(k, res[k].length);
