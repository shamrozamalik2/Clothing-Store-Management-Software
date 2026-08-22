/**
 * Prerender the public marketing routes to static HTML.
 *
 * Why this exists
 * ───────────────
 * Social crawlers (LinkedIn, Facebook, WhatsApp, Slack) do not execute
 * JavaScript. Without prerendering every shared link would show the same
 * generic preview taken from the single index.html, no matter which page was
 * shared. Search engines do render JS, but serving real HTML is faster to
 * index and removes an entire class of failure.
 *
 * How it works
 * ────────────
 * After `vite build`, this serves dist/ locally, visits each public route in
 * a headless browser, waits for the app to render and for usePageMeta to set
 * the per-page title and description, then writes the resulting DOM to
 * dist/<route>/index.html. The SPA still hydrates and takes over on load.
 *
 * Application routes are deliberately NOT prerendered — they sit behind auth
 * and must never be emitted as static HTML.
 *
 * Run: npm run build   (build + prerender + sitemap)
 */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const PORT = 4183;

/* Public routes only. Keep in sync with the public block of src/router. */
const ROUTES = ['/', '/platform', '/how-it-works', '/solutions', '/apps', '/security', '/demo', '/faq'];

const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://probusinesscloud.com';

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

function serveDist() {
  return createServer(async (req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let filePath = join(DIST, urlPath);

    if (!extname(filePath) || !existsSync(filePath)) {
      filePath = join(DIST, 'index.html'); // SPA fallback
    }
    try {
      const body = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch {
    console.warn('[prerender] playwright-core not installed — skipping prerender.');
    console.warn('[prerender] Install it in CI so shared links get correct previews.');
    return;
  }

  const server = serveDist();
  await new Promise((r) => server.listen(PORT, r));

  let browser;
  try {
    browser = await chromium.launch();
  } catch (err) {
    console.warn('[prerender] could not launch a browser — skipping prerender.');
    console.warn('[prerender] ' + String(err).split('\n')[0]);
    server.close();
    return;
  }

  const page = await browser.newPage();
  const written = [];

  for (const route of ROUTES) {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForFunction(() => document.querySelector('#root')?.children.length > 0, { timeout: 20000 });
    await page.waitForTimeout(450); // let usePageMeta settle

    // Absolute canonical + og:url for this route, which crawlers require.
    await page.evaluate(({ origin, path }) => {
      const abs = origin + (path === '/' ? '' : path);
      const put = (sel, attr, key, val) => {
        let el = document.head.querySelector(sel);
        if (!el) {
          el = document.createElement(sel.startsWith('link') ? 'link' : 'meta');
          el.setAttribute(attr, key);
          document.head.appendChild(el);
        }
        el.setAttribute(sel.startsWith('link') ? 'href' : 'content', val);
      };
      put('link[rel="canonical"]', 'rel', 'canonical', abs);
      put('meta[property="og:url"]', 'property', 'og:url', abs);
    }, { origin: SITE_ORIGIN, path: route });

    const html = '<!doctype html>\n' + (await page.evaluate(() => document.documentElement.outerHTML));

    const outDir = route === '/' ? DIST : join(DIST, route);
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, 'index.html'), html, 'utf8');

    const title = await page.title();
    written.push(route);
    console.log(`[prerender] ${route.padEnd(16)} -> ${(route === '/' ? '' : route) + '/index.html'}  "${title.slice(0, 58)}"`);
  }

  await browser.close();
  server.close();

  /* sitemap.xml + robots.txt */
  const today = new Date().toISOString().slice(0, 10);
  const sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    written
      .map((r) => {
        const loc = SITE_ORIGIN + (r === '/' ? '/' : r);
        const priority = r === '/' ? '1.0' : r === '/demo' ? '0.9' : '0.8';
        return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
      })
      .join('\n') +
    '\n</urlset>\n';

  await writeFile(join(DIST, 'sitemap.xml'), sitemap, 'utf8');
  await writeFile(
    join(DIST, 'robots.txt'),
    [
      'User-agent: *',
      'Allow: /',
      '',
      '# Application routes are behind authentication — no value in crawling.',
      'Disallow: /dashboard',
      'Disallow: /pos',
      'Disallow: /settings',
      'Disallow: /reports',
      'Disallow: /admin',
      '',
      `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
      '',
    ].join('\n'),
    'utf8'
  );

  console.log(`[prerender] wrote sitemap.xml (${written.length} urls) and robots.txt`);
}

main().catch((err) => {
  console.error('[prerender] failed:', err);
  process.exit(1);
});
