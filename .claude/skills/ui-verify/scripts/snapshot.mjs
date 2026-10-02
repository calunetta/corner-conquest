#!/usr/bin/env node
/**
 * Opens pages in headless Chromium, saves a desktop and a mobile screenshot of each,
 * and fails when a page logs console errors, throws, or answers with an HTTP error.
 *
 * Usage:
 *   node .claude/skills/ui-verify/scripts/snapshot.mjs <url> [<url> ...] [options]
 *   node .claude/skills/ui-verify/scripts/snapshot.mjs --all [options]
 *
 * Options:
 *   --all          check every preview linked from <base>/testbed
 *   --base <url>   origin of the running app (default http://localhost:9002)
 *   --out <dir>    screenshot folder (default test-results/ui-verify)
 *   --wait <sec>   how long to wait for the server to answer (default 90)
 *
 * Errors logged by other origins (fonts, CDNs) are reported as warnings, not failures.
 * Set CHROMIUM_PATH to use an existing Chromium binary instead of Playwright's download.
 * Exit codes: 0 clean, 1 page errors found, 2 usage, browser or server problem.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const VIEWPORTS = {
  desktop: { viewport: { width: 1280, height: 720 } },
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
};

const USAGE = 'Usage: snapshot.mjs <url> [<url> ...] | --all  [--base <url>] [--out <dir>] [--wait <sec>]';

function parseArgs(argv) {
  const options = { urls: [], all: false, base: 'http://localhost:9002', out: 'test-results/ui-verify', wait: 90 };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--all') options.all = true;
    else if (arg === '--base') options.base = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--wait') options.wait = Number(argv[++index]);
    else if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}`);
    else options.urls.push(arg);
  }

  if (!options.all && options.urls.length === 0) throw new Error('Pass at least one URL, or --all.');
  return options;
}

async function waitForServer(url, seconds) {
  const deadline = Date.now() + seconds * 1000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // Server not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`No answer from ${url} after ${seconds}s. Is the dev server running (npm run dev)?`);
}

async function collectPreviewUrls(browser, base) {
  const page = await browser.newPage();
  await page.goto(new URL('/testbed', base).href, { waitUntil: 'load' });
  const hrefs = await page
    .locator('a[href^="/testbed/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  await page.close();
  return [...new Set(hrefs)].map((href) => new URL(href, base).href);
}

function toFileName(url, viewportName) {
  const { pathname, search } = new URL(url);
  const slug = `${pathname}${search}`.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'home';
  return `${slug}--${viewportName}.png`;
}

async function snapshot(browser, url, viewportName, outDir) {
  const context = await browser.newContext(VIEWPORTS[viewportName]);
  const page = await context.newPage();
  const errors = [];
  const warnings = [];
  const appOrigin = new URL(url).origin;

  page.on('pageerror', (error) => errors.push(`page error: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const source = message.location().url;
    const isOwnOrigin = !source || source.startsWith(appOrigin);
    (isOwnOrigin ? errors : warnings).push(`console: ${message.text()}${source ? ` (${source})` : ''}`);
  });

  const response = await page.goto(url, { waitUntil: 'load', timeout: 120_000 });
  if (!response || response.status() >= 400) errors.push(`HTTP ${response?.status() ?? 'no response'}`);
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

  // The testbed answers 200 for unknown slugs and states; treat its "missing" notice as a failure.
  const missingNotice = page.locator('[data-testid="testbed-missing"]');
  if ((await missingNotice.count()) > 0) errors.push(`testbed: ${await missingNotice.first().innerText()}`);

  const file = path.join(outDir, toFileName(url, viewportName));
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
  await context.close();

  return { url, viewportName, file, errors, warnings };
}

function report({ url, viewportName, file, errors, warnings }) {
  const mark = errors.length === 0 ? 'PASS' : 'FAIL';
  console.log(`${mark} ${viewportName.padEnd(7)} ${url} → ${file}`);
  errors.forEach((error) => console.log(`     error   ${error}`));
  warnings.forEach((warning) => console.log(`     warning ${warning}`));
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`${error.message}\n${USAGE}`);
    return 2;
  }

  const firstUrl = options.all ? new URL('/testbed', options.base).href : options.urls[0];
  try {
    await waitForServer(firstUrl, options.wait);
  } catch (error) {
    console.error(error.message);
    return 2;
  }

  await mkdir(options.out, { recursive: true });
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  } catch (error) {
    console.error(`${error.message.split('\n')[0]}\nRun \`npx playwright install chromium\`, or set CHROMIUM_PATH to a Chromium binary.`);
    return 2;
  }

  try {
    const urls = options.all ? await collectPreviewUrls(browser, options.base) : options.urls;
    if (urls.length === 0) {
      console.error('No URLs to check. Is any preview registered in src/testbed/registry.ts?');
      return 2;
    }

    let failures = 0;
    for (const url of urls) {
      for (const viewportName of Object.keys(VIEWPORTS)) {
        const result = await snapshot(browser, url, viewportName, options.out);
        report(result);
        if (result.errors.length > 0) failures += 1;
      }
    }

    console.log(`\n${urls.length} page(s) × ${Object.keys(VIEWPORTS).length} viewports, ${failures} failing.`);
    return failures === 0 ? 0 : 1;
  } finally {
    await browser.close();
  }
}

process.exitCode = await main();
