// The public production build of docs.wrimo.co (D-41): indexed, rights footer, problem reports and cookieless
// Cloudflare Web Analytics allowed. Every other build stays noindex. Run after `npm run build:public`.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {verifySecurityHeaders} from '../scripts/security-headers.mjs';
import {scan} from '../scripts/publication-guard.mjs';

const node = process.execPath;
const flags = ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', '--input-type=module'];
function configUnder(env) {
  const code = "const {default: c} = await import('./docusaurus.config.ts'); console.log(JSON.stringify({noIndex: c.noIndex, footer: c.themeConfig.footer, sitemap: c.presets[0][1].sitemap}));";
  const result = spawnSync(node, [...flags, '-e', code], {env: {...process.env, WRIMO_DOCS_PUBLIC: '', WRIMO_DOCS_OWNER: '', WRIMO_DOCS_BASE_URL: '', ...env}, encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim().split('\n').at(-1));
}

test('only the standalone public build is indexed', () => {
  const pub = configUnder({WRIMO_DOCS_PUBLIC: '1'});
  assert.equal(pub.noIndex, false);
  assert.ok(pub.sitemap);
  assert.equal(pub.footer.copyright, '© 2026 John Paz. All rights reserved.');
  assert.deepEqual(pub.footer.links, [{label: 'Report a problem', href: 'https://github.com/johnapaz/wrimo-guides/issues/new/choose'}]);
  for (const env of [{}, {WRIMO_DOCS_PUBLIC: '1', WRIMO_DOCS_OWNER: '1'}, {WRIMO_DOCS_PUBLIC: '1', WRIMO_DOCS_BASE_URL: '/docs/'}]) {
    const c = configUnder(env);
    assert.equal(c.noIndex, true, JSON.stringify(env));
    assert.equal(c.sitemap, false);
    assert.equal(c.footer.copyright, 'WriMo documentation preview. Not yet published.');
  }
});

test('the public flag refuses the owner and embedded builds', () => {
  for (const [args, env] of [[['--owner', '--public'], {}], [['--public'], {WRIMO_DOCS_BASE_URL: '/docs/'}]]) {
    const result = spawnSync(node, ['scripts/docusaurus.mjs', 'build', ...args], {env: {...process.env, ...env}, encoding: 'utf8'});
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /never public|Only the standalone/);
  }
});

test('the public artifact is indexable, keeps the CSP and allows only the analytics beacon', () => {
  assert.ok(existsSync('build-public/index.html'), 'run npm run build:public first');
  verifySecurityHeaders('build-public');
  const headers = readFileSync('build-public/_headers', 'utf8');
  assert.ok(!headers.includes('X-Robots-Tag'));
  assert.match(headers, /script-src 'self' https:\/\/static\.cloudflareinsights\.com 'sha256-/);
  assert.match(headers, /connect-src 'self' https:\/\/cloudflareinsights\.com;/);
  for (const expected of ["frame-ancestors 'none'", 'X-Content-Type-Options: nosniff', "object-src 'none'"]) assert.ok(headers.includes(expected));
  assert.doesNotMatch(readFileSync('build-public/index.html', 'utf8'), /noindex/);
  assert.match(readFileSync('build-public/index.html', 'utf8'), /All rights reserved/);
  assert.ok(existsSync('build-public/sitemap.xml'));
  assert.deepEqual(scan('build-public'), []);
});

test('the preview build stays noindex and keeps third-party scripts out', () => {
  const headers = readFileSync('build/_headers', 'utf8');
  assert.ok(headers.includes('X-Robots-Tag: noindex'));
  assert.doesNotMatch(headers, /cloudflareinsights/);
});
