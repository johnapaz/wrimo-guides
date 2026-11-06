// Real Chromium, with the generated HTTP headers (not CSP meta tags).
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync, existsSync, statSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {exerciseSearch} from './search-steps.mjs';

test('navbar search on guide pages and 404 search work under the generated CSP', async () => {
  const build = path.resolve('build');
  const headers = Object.fromEntries(readFileSync(path.join(build, '_headers'), 'utf8').split('\n')
    .filter(l => l.startsWith('  ')).map(l => { const i = l.indexOf(':'); return [l.slice(2, i), l.slice(i + 1).trim()]; }));
  const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
  const server = createServer((req, res) => {
    let file = path.resolve(build, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    let status = 200;
    if (!file.startsWith(build + path.sep) && file !== build) { res.writeHead(400).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!existsSync(file) && existsSync(file + '.html')) file += '.html';
    if (!existsSync(file)) { file = path.join(build, '404.html'); status = 404; }
    res.writeHead(status, {...headers, 'Content-Type': types[path.extname(file)] || 'application/octet-stream'});
    res.end(readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
    const page = await browser.newPage();
    const violations = [];
    await page.addInitScript(() => {
      window.cspViolations = [];
      document.addEventListener('securitypolicyviolation', e => window.cspViolations.push(e.violatedDirective));
    });
    page.on('console', m => { if (/Content Security Policy|violates.*directive/i.test(m.text())) violations.push(m.text()); });
    const base = `http://127.0.0.1:${server.address().port}`;
    // PMR-06: an ordinary guide page offers search in its navbar.
    const guide = await page.goto(`${base}/troubleshooting`);
    assert.equal(guide.status(), 200);
    assert.equal(guide.headers()['content-security-policy'], headers['Content-Security-Policy']);
    await page.locator('html[data-has-hydrated="true"]').waitFor();
    const navbar = page.getByRole('navigation', {name: 'Main'});
    await exerciseSearch(page, navbar, 'Search guides');
    // Keyboard: Escape closes the results and keeps focus in the field; a result opens with Enter.
    const navInput = navbar.getByLabel('Search guides', {exact: true});
    await navInput.press('Escape');
    await navbar.getByRole('status').waitFor({state: 'hidden'});
    assert.ok(await navInput.evaluate(el => el === document.activeElement));
    await navInput.fill('saving backup');
    await navInput.press('Enter');
    const result = navbar.getByRole('list', {name: 'Search results'}).getByRole('link', {name: /Saving/});
    await result.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(`${base}/saving-and-backup`);
    await navbar.getByRole('status').waitFor({state: 'hidden'}); // navigation closes the results
    // The 404 page keeps its inline search.
    const response = await page.goto(`${base}/missing-page`);
    assert.equal(response.status(), 404);
    assert.equal(response.headers()['content-security-policy'], headers['Content-Security-Policy']);
    await page.locator('html[data-has-hydrated="true"]').waitFor();
    await exerciseSearch(page, page.getByRole('main'), 'Search the docs');
    assert.deepEqual(await page.evaluate(() => window.cspViolations), []);
    assert.deepEqual(violations, []);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
