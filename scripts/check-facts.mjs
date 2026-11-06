// App-fact drift check, run as part of `npm run check`. The facts in src/facts.ts are plain copies; the application
// repository's scripts/check-public-facts.mjs compares them with app source. This wrapper runs that check whenever
// the application repository is available: automatically from its website/ folder, or named by WRIMO_APP_REPO_DIR.
// Without it, WRIMO_PRIVATE_DOCS_REQUIRED=1 fails closed; otherwise it reports that the check did not run.
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = path.dirname(site);
const app = process.env.WRIMO_APP_REPO_DIR ? path.resolve(process.env.WRIMO_APP_REPO_DIR)
  : path.basename(site) === 'website' && existsSync(path.join(parent, 'scripts/check-public-facts.mjs')) ? parent : null;
const checker = app && path.join(app, 'scripts/check-public-facts.mjs');

if (!checker || !existsSync(checker)) {
  const reason = app ? `no scripts/check-public-facts.mjs in ${app}` : 'application repository unavailable (set WRIMO_APP_REPO_DIR)';
  if (process.env.WRIMO_PRIVATE_DOCS_REQUIRED === '1') { console.error(`App-fact drift check failed: ${reason}`); process.exit(1); }
  console.log(`App-fact drift not checked: ${reason}`);
  process.exit(0);
}
const result = spawnSync(process.execPath, [checker, site], {cwd: app, stdio: 'inherit'});
process.exit(result.status ?? 1);
