// Use the same explicit mode for config and output, including when the env var is set directly.
// Node sets the env var for the convenience scripts so they also work on Windows.
import {writeSecurityHeaders} from './security-headers.mjs';
import {writeSearchIndex} from './search-index.mjs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const [command, ...options] = process.argv.slice(2);
if (!['start', 'build'].includes(command)) {
  throw new Error('Usage: node scripts/docusaurus.mjs <start|build> [--owner] [Docusaurus options]');
}
if (options.some(option => /^--out-dir(?:=|$)/.test(option))) {
  throw new Error('The build mode controls the output directory; do not override --out-dir.');
}
const env = {...process.env};
if (options.includes('--owner')) env.WRIMO_DOCS_OWNER = '1';
const site = fileURLToPath(new URL('../', import.meta.url));
const cli = fileURLToPath(new URL('../node_modules/@docusaurus/core/bin/docusaurus.mjs', import.meta.url));
const args = [cli, command, ...options.filter(option => option !== '--owner')];
if (command === 'build') args.push('--out-dir', env.WRIMO_DOCS_OWNER === '1' ? 'build-owner' : 'build');
const result = spawnSync(process.execPath, args, {cwd: site, env, stdio: 'inherit'});
if (result.error) throw result.error;
if (result.status === 0 && command === 'build') {
  const output = fileURLToPath(new URL(env.WRIMO_DOCS_OWNER === '1' ? '../build-owner/' : '../build/', import.meta.url));
  writeSearchIndex(output, env.WRIMO_DOCS_BASE_URL === '/docs/' ? '/docs/' : '/');
  writeSecurityHeaders(output);
}
process.exit(result.status ?? 1);
