// Use the same explicit mode for config and output, including when the env var is set directly.
// Node sets the env var for the convenience scripts so they also work on Windows.
import {writeSecurityHeaders} from './security-headers.mjs';
import {writeSearchIndex} from './search-index.mjs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const [command, ...options] = process.argv.slice(2);
if (!['start', 'build'].includes(command)) {
  throw new Error('Usage: node scripts/docusaurus.mjs <start|build> [--owner|--public] [Docusaurus options]');
}
if (options.some(option => /^--out-dir(?:=|$)/.test(option))) {
  throw new Error('The build mode controls the output directory; do not override --out-dir.');
}
const env = {...process.env};
if (options.includes('--owner') && options.includes('--public')) throw new Error('The owner build is never public.');
if (options.includes('--owner')) env.WRIMO_DOCS_OWNER = '1';
// --public: the indexed production build of docs.wrimo.co (D-41). It never combines with the owner or embedded build.
if (options.includes('--public')) {
  if (env.WRIMO_DOCS_OWNER === '1' || env.WRIMO_DOCS_BASE_URL === '/docs/') throw new Error('Only the standalone public-safe build can be public.');
  env.WRIMO_DOCS_PUBLIC = '1';
}
const publicRelease = env.WRIMO_DOCS_PUBLIC === '1' && env.WRIMO_DOCS_OWNER !== '1' && env.WRIMO_DOCS_BASE_URL !== '/docs/';
// Each mode has its own output, so a public artifact is never mistaken for a preview build or the reverse.
const outDir = env.WRIMO_DOCS_OWNER === '1' ? 'build-owner' : publicRelease ? 'build-public' : 'build';
const site = fileURLToPath(new URL('../', import.meta.url));
const cli = fileURLToPath(new URL('../node_modules/@docusaurus/core/bin/docusaurus.mjs', import.meta.url));
const args = [cli, command, ...options.filter(option => option !== '--owner' && option !== '--public')];
if (command === 'build') args.push('--out-dir', outDir);
const result = spawnSync(process.execPath, args, {cwd: site, env, stdio: 'inherit'});
if (result.error) throw result.error;
if (result.status === 0 && command === 'build') {
  const output = fileURLToPath(new URL(`../${outDir}/`, import.meta.url));
  writeSearchIndex(output, env.WRIMO_DOCS_BASE_URL === '/docs/' ? '/docs/' : '/');
  writeSecurityHeaders(output, {publicRelease});
}
process.exit(result.status ?? 1);
