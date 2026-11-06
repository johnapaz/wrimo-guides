// Publication guard: the built site must contain no repo docs/ content, no private docs repository
// records, no demo manuscript text and no protected operational values. Usage: node publication-guard.mjs <buildDir>
// The protected text lives in two private places:
// - the application repository's docs/ records and demo fixture. Found automatically when this guard runs from
//   that repository's website/; WRIMO_APP_REPO_DIR names a checkout of it otherwise (a separate guides repository);
// - WRIMO_PRIVATE_DOCS_DIR, a read-only checkout of the private docs repository.
// WRIMO_PRIVATE_DOCS_REQUIRED=1 (CI on the private side) fails closed unless both are present and hold records.
// Without it, the guard still applies every protected pattern and path rule and reports what it did not scan.
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The application repository root, or null when this guard is outside it and WRIMO_APP_REPO_DIR is unset.
export function appRepoDir(env = process.env) {
  if (env.WRIMO_APP_REPO_DIR) {
    const dir = path.resolve(env.WRIMO_APP_REPO_DIR);
    if (!existsSync(path.join(dir, 'docs')) || !existsSync(path.join(dir, 'fixtures'))) {
      throw new Error(`WRIMO_APP_REPO_DIR has no docs/ and fixtures/: ${dir}`);
    }
    return dir;
  }
  const parent = path.dirname(siteDir);
  const inAppRepo = path.basename(siteDir) === 'website' && existsSync(path.join(parent, 'docs')) && existsSync(path.join(parent, 'fixtures'));
  if (!inAppRepo && env.WRIMO_PRIVATE_DOCS_REQUIRED === '1') {
    throw new Error('WRIMO_PRIVATE_DOCS_REQUIRED=1 but the application repository records are unavailable: set WRIMO_APP_REPO_DIR');
  }
  return inAppRepo ? parent : null;
}

export const repoRoot = appRepoDir();
const WINDOW = 12; // words: long enough to ignore common phrases, short enough to catch a copied sentence
const binary = /\.(png|jpe?g|gif|ico|webp|avif|woff2?|ttf|eot|otf|mp4|webm|pdf|zip)$/i;

export const protectedPatterns = [
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,})/],
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['secret assignment', /\b(?:client_secret|GITHUB_CLIENT_SECRET|SESSION_SECRET|CLOUDFLARE_API_TOKEN|api[_-]?key|access[_-]?token)\b["']?\s*[:=]\s*["']?[A-Za-z0-9_\-.]{12,}/i],
  ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['32-hex account/zone ID', /(?<![0-9a-f])[0-9a-f]{32}(?![0-9a-f])/],
  ['UUID (Access/deployment/project ID)', /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i],
  ['Sites project ID', /\bappgprj_[0-9a-z]+/i],
  ['GitHub App client ID', /\bIv(?:1\.[0-9a-f]{16}|\d{2}[A-Za-z0-9]{16})\b/],
  ['GitHub App installation', /\/installations\/\d{4,}/],
  ['deployment hostname', /[a-z0-9-]+\.(?:workers\.dev|pages\.dev|chatgpt\.site)\b|\bstaging\.wrimo\.(?:app|co)\b/i],
  ['DNS verification value', /google-site-verification=|_github-pages-challenge|_acme-challenge|\bv=(?:spf1|DKIM1|DMARC1)\b|\bMS=ms\d+|cloudflare-verify|\b[a-z]+\.ns\.cloudflare\.com\b/i],
  ['email address', /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[a-z]{2,}\b/],
  ['internal repository link', /github\.com\/johnapaz\/(?:writemo|wrimo-internal)\b/i],
  ['record identifier', /\b[RDQ]-\d{2,}(?:-\d+)?\b/], // a requirement, decision or question ID, optionally issue-qualified
];

const words = text => text.toLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) || [];

function* files(dir, skip = new Set()) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) { if (!skip.has(name)) yield* files(full, skip); }
    else yield full;
  }
}

function markdownText(source) {
  return source.replace(/```[\s\S]*?```/g, ' ').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`|#>]/g, ' ');
}

function htmlText(source) {
  return source.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

function shingles(text) {
  const w = words(text), out = new Set();
  for (let i = 0; i + WINDOW <= w.length; i++) out.add(w.slice(i, i + WINDOW).join(' '));
  return out;
}

export function privateDocsDir(env = process.env) {
  const dir = env.WRIMO_PRIVATE_DOCS_DIR;
  if (!dir && env.WRIMO_PRIVATE_DOCS_REQUIRED === '1') throw new Error('WRIMO_PRIVATE_DOCS_REQUIRED=1 but WRIMO_PRIVATE_DOCS_DIR is unset');
  return dir ? path.resolve(dir) : null;
}

// Every .md record in the private docs repository checkout; an empty or missing checkout is an error, never a pass.
export function privateSources(dir) {
  if (!existsSync(dir)) throw new Error(`private docs checkout not found: ${dir}`);
  const sources = [];
  for (const file of files(dir, new Set(['.git', 'node_modules']))) {
    if (file.endsWith('.md')) sources.push({kind: 'private docs content', file, text: markdownText(readFileSync(file, 'utf8'))});
  }
  if (!sources.length) throw new Error(`private docs checkout has no .md records: ${dir}`);
  return sources;
}

// Material that must never be published: every repo docs/ record, every private docs record and the demo manuscript.
// With root null (outside the application repository) only the private records, if any, are protected text.
export function protectedSources(root = repoRoot, {privateDir = privateDocsDir()} = {}) {
  const sources = [];
  if (root) {
    for (const file of files(path.join(root, 'docs'))) {
      if (file.endsWith('.md')) sources.push({kind: 'repo docs/ content', file, text: markdownText(readFileSync(file, 'utf8'))});
    }
    const fixtures = path.join(root, 'fixtures');
    for (const file of files(fixtures)) {
      if (/\.(md|json)$/.test(file)) sources.push({kind: 'manuscript text', file, text: markdownText(readFileSync(file, 'utf8'))});
    }
    if (!sources.some(s => s.kind === 'repo docs/ content')) throw new Error(`application repository has no docs/ records: ${root}`);
  }
  if (privateDir) sources.push(...privateSources(privateDir)); // last, so text still held in docs/ keeps its app-repo attribution
  return sources;
}

export function buildIndex(sources) {
  const index = new Map();
  for (const {kind, file, text} of sources) for (const s of shingles(text)) if (!index.has(s)) index.set(s, {kind, file});
  return index;
}

export function scan(buildDir, {root = repoRoot, index = buildIndex(protectedSources(root))} = {}) {
  const findings = [];
  const docNames = root ? readdirSync(path.join(root, 'docs')).filter(n => n.endsWith('.md')) : [];
  for (const file of files(buildDir)) {
    if (binary.test(file)) continue;
    const raw = readFileSync(file, 'utf8');
    const rel = path.relative(buildDir, file);
    const text = file.endsWith('.html') ? htmlText(raw) : raw;
    for (const [name, pattern] of protectedPatterns) {
      const match = raw.match(pattern) || (text !== raw && text.match(pattern));
      if (match) findings.push({file: rel, kind: name, sample: match[0].slice(0, 80)});
    }
    for (const name of docNames) {
      const at = raw.search(new RegExp(`(?<!@site/)docs/${name.replace('.', '\\.')}\\b`));
      if (at >= 0) findings.push({file: rel, kind: 'repo docs/ path', sample: `docs/${name}`});
    }
    const w = words(text);
    for (let i = 0; i + WINDOW <= w.length; i++) {
      const hit = index.get(w.slice(i, i + WINDOW).join(' '));
      if (hit) {
        findings.push({file: rel, kind: hit.kind, sample: `${w.slice(i, i + WINDOW).join(' ')} (from ${path.relative(root, hit.file)})`});
        break;
      }
    }
  }
  return findings;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const buildDir = path.resolve(process.argv[2] || 'build');
  let privateDir, sources;
  try {
    privateDir = privateDocsDir();
    sources = protectedSources(repoRoot, {privateDir});
  } catch (error) {
    console.error(`Publication guard failed: ${error.message}`);
    process.exit(1);
  }
  const findings = scan(buildDir, {index: buildIndex(sources)});
  if (findings.length) {
    console.error(`Publication guard failed: ${findings.length} finding(s) in ${buildDir}`);
    for (const f of findings) console.error(`- ${f.file}: ${f.kind}: ${f.sample}`);
    process.exit(1);
  }
  const scope = [
    repoRoot ? `${sources.filter(s => s.kind === 'repo docs/ content').length} application records included` : 'application records not scanned: WRIMO_APP_REPO_DIR unset',
    privateDir ? `${sources.filter(s => s.kind === 'private docs content').length} private records included` : 'private records not scanned: WRIMO_PRIVATE_DOCS_DIR unset',
  ].join('; ');
  console.log(`Publication guard passed for ${buildDir} (${scope})`);
}
