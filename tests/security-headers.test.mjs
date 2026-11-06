import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifySecurityHeaders} from '../scripts/security-headers.mjs';
import {scan} from '../scripts/publication-guard.mjs';

test('generated headers cover every inline script and enforce the pre-release controls', () => {
  const result = verifySecurityHeaders('build');
  assert.ok(result.pages >= 4);
  assert.ok(result.inlineScripts > 0);
  const headers = readFileSync('build/_headers', 'utf8');
  for (const expected of ["frame-ancestors 'none'", 'X-Content-Type-Options: nosniff',
    'Referrer-Policy: no-referrer', 'X-Robots-Tag: noindex', "connect-src 'self'"]) assert.ok(headers.includes(expected));
  assert.ok(headers.split('\n').every(line => Buffer.byteLength(line) <= 2000));
  // Independently hash the raw bootstrap from a real page.
  const bootstrap = readFileSync('build/index.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.ok(headers.includes(`'sha256-${createHash('sha256').update(bootstrap).digest('base64')}'`));
});

test('a post-build inline script mutation is rejected', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'wrimo-csp-'));
  try {
    cpSync('build', dir, {recursive: true});
    const file = path.join(dir, '404.html');
    writeFileSync(file, readFileSync(file, 'utf8').replace('</head>', '<script>window.unreviewed = true</script></head>'));
    assert.throws(() => verifySecurityHeaders(dir), /Uncovered inline script/);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('publication guard includes deployment-control files in the actual upload directory', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'wrimo-control-'));
  try {
    for (const name of ['_headers', '_redirects', '_routes.json', '_worker.js']) {
      writeFileSync(path.join(dir, name), 'https://github.com/johnapaz/writemo');
      assert.ok(scan(dir).some(f => f.file === name && f.kind === 'internal repository link'), name);
    }
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
