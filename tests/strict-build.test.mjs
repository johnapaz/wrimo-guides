// Negative builds: each case adds one bad link to a page in a disposable copy of the site
// and proves `docusaurus build` fails for the expected reason. Slow (one build per case).
// Copies share node_modules, so the persistent webpack cache is disabled to keep builds isolated.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {appendFileSync, cpSync, mkdtempSync, rmSync, symlinkSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.dirname(site);
const skip = new Set(['node_modules', 'build', 'build-owner', '.docusaurus']);

function siteCopy() {
  const root = mkdtempSync(path.join(tmpdir(), 'wrimo-strict-'));
  cpSync(site, path.join(root, 'website'), {recursive: true, filter: src => !skip.has(path.basename(src))});
  symlinkSync(path.join(site, 'node_modules'), path.join(root, 'website/node_modules'), 'dir');
  // facts.ts imports app source, and repo docs/ must exist for the internal-link case to be realistic.
  for (const dir of ['src', 'web', 'docs']) symlinkSync(path.join(repo, dir), path.join(root, dir), 'dir');
  return root;
}

function build(cwd) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['node_modules/@docusaurus/core/bin/docusaurus.mjs', 'build', '--no-minify'], {cwd, env: {...process.env, FORCE_COLOR: '0', DOCUSAURUS_NO_PERSISTENT_CACHE: 'true'}});
    let output = '';
    child.stdout.on('data', d => output += d);
    child.stderr.on('data', d => output += d);
    child.on('close', code => resolve({code, output}));
  });
}

const cases = [
  ['a broken page link', '[missing](/does-not-exist)', /broken link/i],
  ['a broken anchor', '[missing](./saving-and-backup.mdx#no-such-heading)', /broken anchor/i],
  ['a broken Markdown file link', '[missing](./missing-page.mdx)', /couldn't be resolved|could not be resolved/i],
  ['a link into repo docs/', '[record](../../docs/internal-record.md)', /Internal link in public page[\s\S]*outside website\/docs/],
  ['a link to the private repository', '[record](https://github.com/johnapaz/writemo/blob/main/docs/internal-record.md)', /Internal link in public page[\s\S]*private application repository/],
];

test('strict validation fails the build', {concurrency: true}, async t => {
  await Promise.all(cases.map(([name, markdown, expected]) =>
    t.test(name, async () => {
      const root = siteCopy();
      try {
        appendFileSync(path.join(root, 'website/docs/limitations.mdx'), `\n\nSee ${markdown}.\n`);
        const {code, output} = await build(path.join(root, 'website'));
        assert.notEqual(code, 0, `build should fail for ${name}`);
        assert.match(output, expected);
      } finally {
        rmSync(root, {recursive: true, force: true});
      }
    })));
});

// Theme links need the same strict route/anchor checks as Markdown pages.
test('strict validation covers the swizzled 404 content', async t => {
  for (const [target, expected] of [
    ['/does-not-exist', /broken link/i],
    ['/saving-and-backup#no-such-heading', /broken anchor/i],
  ]) {
    await t.test(target, async () => {
      const root = siteCopy();
      try {
        const component = path.join(root, 'website/src/theme/NotFound/Content/index.tsx');
        const original = readFileSync(component, 'utf8');
        assert.ok(original.includes('to="/saving-and-backup"'));
        writeFileSync(component, original.replace('to="/saving-and-backup"', `to="${target}"`));
        const {code, output} = await build(path.join(root, 'website'));
        assert.notEqual(code, 0, 'broken 404 navigation must fail the build');
        assert.match(output, expected);
        assert.match(output, /404/);
      } finally {
        rmSync(root, {recursive: true, force: true});
      }
    });
  }
});
