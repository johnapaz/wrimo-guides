// Run after both builds. No skips: a missing artifact must fail locally and in CI.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {editUrl, editRepositoryIsPrivate} from '../source-repository.mjs';

const site = fileURLToPath(new URL('../', import.meta.url));
const editBase = editUrl;
const read = file => readFileSync(path.join(site, file), 'utf8');
const files = dir => readdirSync(path.join(site, dir), {recursive: true})
  .map(name => path.join(dir, name)).filter(file => statSync(path.join(site, file)).isFile());
const pages = dir => files(dir).filter(file => file.endsWith('.html'));
const editLinks = html => [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
  .filter(([, , body]) => body.replace(/<[^>]*>/g, '').trim() === 'Edit this page')
  .map(([, href]) => href);
const guard = dir => spawnSync(process.execPath, ['scripts/publication-guard.mjs', dir], {cwd: site, encoding: 'utf8'});

test('only WRIMO_DOCS_OWNER=1 enables the built-in editUrl', () => {
  for (const value of [undefined, '0', 'true', '1']) {
    const env = {...process.env};
    delete env.WRIMO_DOCS_OWNER;
    if (value !== undefined) env.WRIMO_DOCS_OWNER = value;
    const result = spawnSync(process.execPath, ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', '--input-type=module', '-e',
      "import config from './docusaurus.config.ts'; console.log(JSON.stringify(config.presets[0][1].docs.editUrl ?? null));"],
    {cwd: site, env, encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout), value === '1' ? editBase : null);
  }
});

test('the default build still has no edit links and passes the guard after the owner build', () => {
  const htmlFiles = pages('build');
  assert.ok(htmlFiles.includes(path.join('build', 'index.html')));
  for (const file of htmlFiles) {
    assert.deepEqual(editLinks(read(file)), [], file);
    assert.ok(!read(file).includes(editBase), file);
    assert.match(read(file), /<meta\b[^>]*name="robots" content="noindex, nofollow"/);
  }
  const result = guard('build');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Publication guard passed/);
});

test('every owner docs page has a built-in edit link pointing to its source page', () => {
  // Docusaurus's generated 404 has no docs source or edit link (#52 is separate).
  const htmlFiles = pages('build-owner').filter(file => path.basename(file) !== '404.html');
  const sourceFiles = files('docs')
    .filter(file => /\.mdx?$/.test(file) && !file.split(path.sep).some(part => part.startsWith('_')))
    .map(file => file.split(path.sep).join('/'));
  assert.ok(htmlFiles.includes(path.join('build-owner', 'index.html')));
  assert.equal(htmlFiles.length, sourceFiles.length, 'all routed docs pages are checked');
  const linkedSources = [];
  for (const file of htmlFiles) {
    const html = read(file);
    const links = editLinks(html);
    assert.equal(links.length, 1, `one edit link on ${file}`);
    assert.ok(links[0].startsWith(editBase), links[0]);
    const source = decodeURIComponent(links[0].slice(editBase.length));
    assert.ok(sourceFiles.includes(source), `existing website/docs/ source for ${file}: ${source}`);
    linkedSources.push(source);
    assert.match(html, /<meta\b[^>]*name="robots" content="noindex, nofollow"/);
  }
  assert.deepEqual(linkedSources.sort(), sourceFiles.sort(), 'every source page is linked exactly once');
  assert.deepEqual(editLinks(read('build-owner/index.html')), [`${editBase}docs/getting-started.mdx`]);
});

test('the unchanged publication guard rejects owner output only while edit links point to a private repository', () => {
  const result = guard('build-owner');
  if (editRepositoryIsPrivate) {
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Publication guard failed/);
    assert.match(result.stderr, /internal repository link/);
  } else {
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(editBase, /github\.com\/johnapaz\/(?:writemo|wrimo-internal)\b/i);
  }
});
