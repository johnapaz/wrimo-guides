import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {status, ui, usageEvents, backupLimitLabel} from '../src/facts.ts';

// The app-side drift check lives in the application repository (scripts/check-public-facts.mjs); this checks the
// built pages render the shared facts.
test('built pages render the shared facts', {skip: !existsSync('build/index.html') && !process.env.CI && 'run npm run build first'}, () => {
  const page = name => readFileSync(`build/${name}.html`, 'utf8');
  for (const event of usageEvents) assert.match(page('privacy-and-ownership'), new RegExp(`<code>${event}</code>`));
  assert.match(page('limitations'), new RegExp(backupLimitLabel));
  for (const label of [ui.newBlankProject, ui.connectOrRecover, ui.fromGitHub, ui.projectOptions, ui.onThisDevice, ui.nameProject, ui.beforeSignIn, ui.copyAndOpen]) assert.ok(page('projects').includes(label), `${label} on projects`);
  assert.ok(page('index').includes(ui.startWriting), `${ui.startWriting} on index`);
  // The save-states partial renders on more than one page.
  const partial = readFileSync('docs/_partials/_save-states.mdx', 'utf8').match(/WriMo saves it to this browser [^.|]+/)[0];
  for (const name of ['index', 'saving-and-backup']) {
    assert.ok(page(name).includes(partial), `save-states partial on ${name}`);
    for (const label of [status.pending, status.saved, status.backedUp]) assert.ok(page(name).includes(label), `${label} on ${name}`);
  }
});
