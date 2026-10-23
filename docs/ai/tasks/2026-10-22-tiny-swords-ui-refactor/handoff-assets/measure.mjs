import { chromium } from '/Users/clunetta/Documents/Games/Corner Conquest/node_modules/@playwright/test/index.mjs';
import fs from 'fs';
const out = process.argv[2];
const base = 'http://localhost:9002';
const pages = ['ctl-temp','testbed/lobby-settings-sheet','testbed/lobby-create-dialog','testbed/lobby-game-row','testbed/cards-cards-dialog','testbed/hud-game-log','testbed/hud-game-board-header','testbed/hud-actions-panel','testbed/combat-combat-dialog','testbed/combat-monster-combat-dialog'];
const sel = '[role=switch],[role=checkbox],[role=radio],[role=slider],[role=separator],[data-radix-scroll-area-viewport],[data-orientation][data-radix-scroll-area-scrollbar],span.relative.flex.shrink-0.overflow-hidden,[data-orientation],[data-m]';
const b = await chromium.launch(); const res = {};
for (const vp of [[1280,720],[390,844]]) {
  const ctx = await b.newContext({ viewport: { width: vp[0], height: vp[1] } }); const p = await ctx.newPage();
  for (const path of pages) {
    await p.goto(`${base}/${path}`, { waitUntil: 'networkidle' }).catch(()=>{});
    const links = path.startsWith('testbed') ? await p.$$eval('[data-testid=testbed-state-list] a', a => a.map(x => x.getAttribute('href'))) : [null];
    for (const href of links) {
      if (href) await p.goto(base + href, { waitUntil: 'networkidle' }).catch(()=>{});
      await p.waitForTimeout(500);
      const r = await p.evaluate((s) => [...document.querySelectorAll(s)].map(e => { const b = e.getBoundingClientRect(); return [e.tagName+'|'+(e.getAttribute('role')||e.getAttribute('data-m')||e.getAttribute('data-orientation')||''), Math.round(b.width*100)/100, Math.round(b.height*100)/100]; }), sel);
      res[`${vp[0]} ${href||path}`] = r;
    }
  }
  await ctx.close();
}
await b.close(); fs.writeFileSync(out, JSON.stringify(res, null, 1));
for (const [k,v] of Object.entries(res)) console.log(k, v.length);
