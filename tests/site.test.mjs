import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { SEO_PAGES, renderSeoPage } from '../scripts/generate-seo-pages.mjs';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const privacy = await readFile(new URL('../privacy-policy.html', import.meta.url), 'utf8');
const manifest = await readFile(new URL('../public/site.webmanifest', import.meta.url), 'utf8');
const mainCss = await readFile(new URL('../styles/main.css', import.meta.url), 'utf8');
const mainTs = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
const sitemap = await readFile(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const routes = ['home', 'offerte', 'tracking', 'wishlist-ai', 'smart-care', 'prezzi', 'forum'];

test('all routes and required content are publishable', () => {
  const pages = [...html.matchAll(/data-page="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(pages, routes);

  for (const route of routes) assert.match(html, new RegExp(`data-route-link="${route}"`));
  assert.match(html, /<nav class="nav-links"[^>]*>[\s\S]*?<a href="\/" data-route-link="home">Home<\/a>/);
  for (const path of ['/offerte/', '/tracking/', '/wishlist-ai/', '/smart-care/', '/prezzi/', '/forum/']) {
    assert.ok(html.includes(`href="${path}"`), `Missing real navigation URL: ${path}`);
  }
  assert.doesNotMatch(html, /href="#(?:home|offerte|tracking|wishlist-ai|smart-care|prezzi|forum)"/);
  for (const value of ['1 prodotto', '3 / mese', '10 prodotti', '30 / mese', '150 / mese', '20 / mese']) {
    assert.ok(html.includes(value), `Missing plan value: ${value}`);
  }

  assert.ok(!html.includes('APP_STORE_URL'));
  assert.ok(!html.includes('PLAY_STORE_URL'));
  assert.ok(html.includes('/assets/screens/offers-home.png'));
  assert.ok(html.includes('class="signal-cloud"'));
  assert.ok(!html.includes('orbit-label'));
  assert.ok(html.includes('/assets/store/app-store.svg'));
  assert.ok(html.includes('/assets/store/google-play.png'));
  assert.ok(html.includes('data-store-coming-soon="App Store"'));
  assert.ok(html.includes('data-store-coming-soon="Google Play"'));
  assert.ok(html.includes('class="coming-soon-dialog"'));
  assert.ok(html.includes('/assets/brand/germano-mascot.png'));
  assert.match(html, /class="deal-product"><img src="\/assets\/brand\/germano-icon\.png"/);
  assert.ok(html.includes('aria-label="Apri menu"'));
  assert.ok(!html.includes('<span>Menu</span>'));
  assert.ok(html.includes('/assets/screens/wishlist-ai.png'));
  assert.ok(html.includes('/assets/screens/smart-care.png'));
  assert.ok(html.includes('"@type": "WebSite"'));
  assert.ok(html.includes('"alternateName": ["Offerte Senza Sforzi", "OSS"]'));
  assert.match(html, /<p class="lead">[^<]*offerte senza sforzi/);
});

test('SEO build creates one canonical, crawlable page per feature', () => {
  for (const page of SEO_PAGES) {
    const rendered = renderSeoPage(html, page);
    const renderedRoutes = [...rendered.matchAll(/data-page="([^"]+)"/g)].map(
      (match) => match[1],
    );

    assert.deepEqual(renderedRoutes, [page.route]);
    assert.ok(rendered.includes(`<title>${page.title}</title>`));
    assert.ok(
      rendered.includes(
        `<link rel="canonical" href="https://offertesenzasforzi.com${page.path}">`,
      ),
    );
    assert.ok(rendered.includes(`<body data-route="${page.route}">`));
    assert.ok(!rendered.match(new RegExp(`data-page="${page.route}"[^>]* hidden`)));
    assert.ok(
      rendered.includes(
        `<meta name="robots" content="${page.index === false ? 'noindex, follow' : 'index, follow'}">`,
      ),
    );
  }

  for (const page of SEO_PAGES.filter((candidate) => candidate.index !== false)) {
    assert.ok(
      sitemap.includes(`<loc>https://offertesenzasforzi.com${page.path}</loc>`),
      `Missing sitemap URL: ${page.path}`,
    );
  }
  assert.ok(!sitemap.includes('/forum/'));
});

test('privacy page keeps its legal sections and dedicated motion entrypoint', () => {
  for (const section of ['about', 'data', 'use', 'amazon', 'payments', 'collaborations', 'retention', 'rights']) {
    assert.ok(privacy.includes(`id="${section}"`), `Missing privacy section: ${section}`);
  }

  assert.ok(privacy.includes('/src/privacyPolicy.ts'));
  assert.ok(!privacy.includes('/src/main.ts'));
  for (const value of ['19.99 EUR/year', '49.99 EUR/year', '10 products', '30 Wishlist AI', '5 Smart Care AI']) {
    assert.ok(privacy.includes(value), `Missing current privacy plan value: ${value}`);
  }
});

test('popup is centered and public images are organized', async () => {
  assert.match(mainCss, /\.coming-soon-dialog\s*\{[^}]*position: fixed;[^}]*inset: 50% auto auto 50%;[^}]*transform: translate\(-50%, -50%\);/s);

  const images = (await readdir(new URL('../public/', import.meta.url), { recursive: true }))
    .filter((path) => /\.(?:png|svg)$/i.test(path))
    .sort();
  const expected = [
    'assets/brand/germano-icon.png',
    'assets/brand/germano-mascot.png',
    'assets/screens/offers-home.png',
    'assets/screens/smart-care.png',
    'assets/screens/wishlist-ai.png',
    'assets/store/app-store.svg',
    'assets/store/google-play.png',
  ];

  assert.deepEqual(images, expected);
  for (const image of expected) {
    assert.ok(`${html}${privacy}${manifest}`.includes(`/${image}`), `Unused public image: ${image}`);
  }
});

test('offers demo has connected, accessible actions and a recoverable state', () => {
  for (const action of ['discard', 'refresh', 'save', 'recover']) {
    assert.match(html, new RegExp(`<button[^>]+data-offer-action="${action}"`));
  }
  assert.ok(html.includes('data-offer-status aria-live="polite"'));
  assert.ok(html.includes('data-offer-notice aria-hidden="true"'));
  assert.match(mainCss, /\.deal-interaction\s*\{[^}]*position: absolute;/s);
  assert.match(mainTs, /function initOfferDemo\(\): void/);
  assert.match(mainTs, /Offerta recuperata e aggiunta ai preferiti/);
});
