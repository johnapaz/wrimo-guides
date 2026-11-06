import test from 'node:test';
import assert from 'node:assert/strict';
import {copyFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {scan, buildIndex, protectedSources, privateDocsDir} from '../scripts/publication-guard.mjs';

// Synthetic protected text, so these tests run the same in the application repository and in a separate
// guides repository. Real-record coverage lives in the application repository's tests/publication-guard-records.test.mjs.
const tree = (prefix, files) => {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, name)), {recursive: true});
    writeFileSync(path.join(dir, name), body);
  }
  return dir;
};
const architecture = 'Synthetic architecture record: the storage adapter writes every chapter file before it updates the project journal on disk.';
const handoff = 'Synthetic handoff record: the release operator confirmed the staging upload and kept the earlier artifact for a later rollback.';
const manuscript = 'The synthetic juror walked the long road past the mill and counted every fence post until the courthouse bell rang.';
const appRoot = tree('wrimo-app-', {
  'docs/synthetic-architecture.md': `# Architecture\n\n${architecture}\n`,
  'docs/synthetic-handoff.md': `# Handoff\n\n${handoff}\n`,
  'fixtures/rural-juror/The-Rural-Juror.md': `# The Rural Juror\n\n${manuscript}\n`,
});
const index = buildIndex(protectedSources(appRoot, {privateDir: null}));
const fakeBuild = files => tree('wrimo-guard-', files);
const kinds = dir => scan(dir, {root: appRoot, index}).map(f => f.kind);
const page = body => `<!doctype html><html><head><title>t</title></head><body><main><p>${body}</p></main></body></html>`;

test('the real build output passes the guard', {skip: !existsSync('build/index.html') && !process.env.CI && 'run npm run build first'}, () => {
  assert.deepEqual(scan('build'), []);
});

test('a clean synthetic page passes', () => {
  assert.deepEqual(kinds(fakeBuild({'index.html': page('Choose Save now and wait for Saved locally before closing the tab.')})), []);
});

test('repo docs/ content is detected, including through HTML markup and entities', () => {
  const line = architecture;
  const marked = line.split(' ').map((w, i) => i % 3 ? w : `<em>${w}</em>`).join(' ').replace(/'/g, '&#x27;');
  assert.ok(kinds(fakeBuild({'leak.html': page(marked)})).includes('repo docs/ content'));
  const js = fakeBuild({'assets/js/chunk.js': `const x=${JSON.stringify(handoff)};`});
  assert.ok(kinds(js).includes('repo docs/ content'));
  assert.ok(kinds(fakeBuild({'a.js': '"source":"docs/synthetic-handoff.md"'})).includes('repo docs/ path'));
  assert.deepEqual(kinds(fakeBuild({'a.js': '"source":"@site/docs/getting-started.mdx"'})), []);
});

test('demo manuscript text is detected', () => {
  assert.ok(kinds(fakeBuild({'story.html': page(manuscript)})).includes('manuscript text'));
});

test('protected operational patterns are detected', () => {
  // Synthetic values shaped like the real thing; none are real credentials or identifiers.
  const samples = {
    'GitHub token': `ghp_${'A1b2'.repeat(9)}`,
    'private key': '-----BEGIN RSA PRIVATE KEY-----',
    'secret assignment': 'GITHUB_CLIENT_SECRET=abcdef0123456789abcdef',
    'JWT': 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzeW50aGV0aWMifQ.c3ludGhldGljc2lnbmF0dXJl',
    'AWS access key': 'AKIAABCDEFGHIJKLMNOP',
    '32-hex account/zone ID': '0123456789abcdef0123456789abcdef',
    'UUID (Access/deployment/project ID)': '00000000-0000-4000-8000-000000000000',
    'Sites project ID': 'appgprj_0000synthetic',
    'GitHub App client ID': 'Iv23liSYNTHETIC00000',
    'GitHub App installation': 'https://github.com/settings/installations/12345678',
    'deployment hostname': 'https://wrimo-app-staging.synthetic.workers.dev',
    'DNS verification value': 'google-site-verification=synthetic',
    'email address': 'someone@example.com',
    'internal repository link': '<a href="https://github.com/johnapaz/writemo/blob/main/docs/internal-record.md">x</a>',
    'record identifier': 'See D-990 for details.',
  };
  for (const [kind, sample] of Object.entries(samples)) {
    assert.ok(kinds(fakeBuild({'page.html': page(sample)})).includes(kind), `${kind} not detected in HTML`);
    assert.ok(kinds(fakeBuild({'assets/js/x.js': `var s=${JSON.stringify(sample)};`})).includes(kind), `${kind} not detected in JS`);
  }
});

test('issue-qualified record identifiers and the private docs repository are detected', () => {
  const samples = {
    'record identifier': ['Recorded as D-991-1.', 'See Q-992-2 and R-993-3.', 'Issue-qualified D-994.'],
    'internal repository link': ['<a href="https://github.com/johnapaz/wrimo-internal/blob/main/README.md">x</a>'],
  };
  for (const [kind, list] of Object.entries(samples)) for (const sample of list) {
    assert.ok(kinds(fakeBuild({'page.html': page(sample)})).includes(kind), `${kind} not detected in HTML: ${sample}`);
    assert.ok(kinds(fakeBuild({'assets/js/x.js': `var s=${JSON.stringify(sample)};`})).includes(kind), `${kind} not detected in JS: ${sample}`);
  }
  assert.deepEqual(kinds(fakeBuild({'page.html': page('COVID-19 and step D-1 are not record identifiers.')})), []);
});

// Private docs repository (#114): records that leave docs/ must stay protected. CI sets WRIMO_PRIVATE_DOCS_DIR
// to a read-only checkout of johnapaz/wrimo-internal and WRIMO_PRIVATE_DOCS_REQUIRED=1.
const privateRecords = files => tree('wrimo-private-', files);
const moved = 'Synthetic moved record: the lighthouse keeper filed every planning note under the copper kettle before dawn.';

test('a record held only in the private docs repository is detected, in pages and bundles', () => {
  const dir = privateRecords({'handoffs/2026-01-01-synthetic.md': `# Synthetic\n\n${moved}\n`, 'node_modules/x/README.md': 'ignored dependency text'});
  const sources = protectedSources(appRoot, {privateDir: dir});
  assert.ok(sources.some(s => s.kind === 'private docs content' && s.file.endsWith('2026-01-01-synthetic.md')));
  assert.ok(!sources.some(s => s.file.includes('node_modules')));
  const withPrivate = buildIndex(sources);
  const found = d => scan(d, {root: appRoot, index: withPrivate}).map(f => f.kind);
  assert.ok(found(fakeBuild({'docs/leak/index.html': page(moved.split(' ').map((w, i) => i % 4 ? w : `<strong>${w}</strong>`).join(' '))})).includes('private docs content'));
  assert.ok(found(fakeBuild({'search-index.json': JSON.stringify([{title: 't', text: moved}])})).includes('private docs content'));
  assert.deepEqual(kinds(fakeBuild({'page.html': page(moved)})), [], 'without the private checkout the same text is not protected');
});

test('the private docs scan fails closed', () => {
  assert.throws(() => privateDocsDir({WRIMO_PRIVATE_DOCS_REQUIRED: '1'}), /WRIMO_PRIVATE_DOCS_DIR is unset/);
  assert.equal(privateDocsDir({}), null);
  assert.throws(() => protectedSources(appRoot, {privateDir: path.join(tmpdir(), 'wrimo-no-such-checkout')}), /not found/);
  assert.throws(() => protectedSources(appRoot, {privateDir: privateRecords({'site/a.ts': 'x'})}), /no \.md records/);
  assert.throws(() => protectedSources(tree('wrimo-empty-app-', {'docs/notes.txt': 'x', 'fixtures/a.json': '{}'}), {privateDir: null}), /no docs\/ records/);
});

// The guard copied into a separate guides repository: no application repository around it.
const guardCopy = () => {
  const site = tree('wrimo-guides-', {'package.json': '{"type":"module"}'});
  mkdirSync(path.join(site, 'scripts'));
  copyFileSync(fileURLToPath(new URL('../scripts/publication-guard.mjs', import.meta.url)), path.join(site, 'scripts/publication-guard.mjs'));
  return site;
};
const runGuard = (site, build, env) => spawnSync(process.execPath, ['scripts/publication-guard.mjs', build], {cwd: site, encoding: 'utf8',
  env: {PATH: process.env.PATH, ...env}});

test('outside the application repository the guard still applies every pattern and says what it did not scan', () => {
  const site = guardCopy();
  const clean = runGuard(site, fakeBuild({'index.html': page('Choose Save now.')}), {});
  assert.equal(clean.status, 0, clean.stderr);
  assert.match(clean.stdout, /application records not scanned: WRIMO_APP_REPO_DIR unset; private records not scanned/);
  const leak = runGuard(site, fakeBuild({'index.html': page('Write to someone@example.com or see D-990.')}), {});
  assert.equal(leak.status, 1);
  assert.match(leak.stderr, /email address/);
  assert.match(leak.stderr, /record identifier/);
});

test('outside the application repository a required scan fails closed without both record sets', () => {
  const site = guardCopy();
  const build = fakeBuild({'index.html': page('Choose Save now.')});
  const records = privateRecords({'records/a.md': `# A\n\n${moved}\n`});
  for (const env of [
    {WRIMO_PRIVATE_DOCS_REQUIRED: '1'},
    {WRIMO_PRIVATE_DOCS_REQUIRED: '1', WRIMO_PRIVATE_DOCS_DIR: records},
    {WRIMO_PRIVATE_DOCS_REQUIRED: '1', WRIMO_APP_REPO_DIR: appRoot},
    {WRIMO_PRIVATE_DOCS_REQUIRED: '1', WRIMO_APP_REPO_DIR: tree('wrimo-not-app-', {'README.md': 'x'}), WRIMO_PRIVATE_DOCS_DIR: records},
  ]) {
    const result = runGuard(site, build, env);
    assert.equal(result.status, 1, `${JSON.stringify(Object.keys(env))} should fail: ${result.stdout}`);
  }
  const ok = runGuard(site, build, {WRIMO_PRIVATE_DOCS_REQUIRED: '1', WRIMO_APP_REPO_DIR: appRoot, WRIMO_PRIVATE_DOCS_DIR: records});
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /2 application records included; 1 private records included/);
});

test('outside the application repository, named record sets catch copied application and private text', () => {
  const site = guardCopy();
  const records = privateRecords({'records/a.md': `# A\n\n${moved}\n`});
  const env = {WRIMO_PRIVATE_DOCS_REQUIRED: '1', WRIMO_APP_REPO_DIR: appRoot, WRIMO_PRIVATE_DOCS_DIR: records};
  for (const [text, kind] of [[architecture, 'repo docs/ content'], [manuscript, 'manuscript text'], [moved, 'private docs content']]) {
    const result = runGuard(site, fakeBuild({'docs/page.html': page(text)}), env);
    assert.equal(result.status, 1, kind);
    assert.match(result.stderr, new RegExp(kind.replace('/', '\\/')));
  }
  const pathLeak = runGuard(site, fakeBuild({'a.js': '"source":"docs/synthetic-handoff.md"'}), env);
  assert.match(pathLeak.stderr, /repo docs\/ path/);
});
