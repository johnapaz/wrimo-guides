import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {scan} from '../scripts/publication-guard.mjs';

test('404 provides WriMo guide links to built pages and stays noindex', () => {
  assert.ok(existsSync('build/404.html'), 'run npm run build first');
  const html = readFileSync('build/404.html', 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
  assert.ok(main.includes("Oh dang! We couldn&#x27;t find what you&#x27;re after."));
  assert.match(main, /<form[^>]*role="search"/);
  assert.match(main, /<label[^>]*for="docs-search">Search the docs<\/label>/);
  assert.match(main, /<input[^>]*type="search"/);
  assert.match(html, /<meta\b[^>]*name="robots"\s+content="[^"]*\bnoindex\b[^"]*"/);
  const links = [...main.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)];
  for (const [href, label, page] of [
    ['/', 'Getting started', 'index'],
    ['/saving-and-backup', 'Saving and backup', 'saving-and-backup'],
    ['/limitations', 'Limitations', 'limitations'],
  ]) {
    assert.ok(links.some(link => link[1] === href && link[2] === label), label);
    assert.ok(existsSync(`build/${page}.html`), `${href} resolves to a built page`);
  }
  assert.deepEqual(scan('build').filter(f => f.file === '404.html'), []);
});

// PMR-06: search is discoverable from every ordinary guide page, not only the 404 page.
test('every guide page renders the navbar search form', () => {
  const guides = JSON.parse(readFileSync('build/search-index.json', 'utf8'));
  for (const {url} of guides) {
    const html = readFileSync(`build/${url === '/' ? 'index' : url.slice(1)}.html`, 'utf8');
    const nav = html.match(/<nav\b[^>]*aria-label="Main"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? '';
    assert.match(nav, /<form[^>]*role="search"/, url);
    assert.match(nav, /<label[^>]*for="docs-search-navbar"[^>]*>Search guides<\/label>/, url);
    assert.match(nav, /<input[^>]*id="docs-search-navbar"[^>]*type="search"/, url);
  }
});
