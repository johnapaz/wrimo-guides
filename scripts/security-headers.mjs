// Hash the exact generated script bodies, after Docusaurus finishes writing HTML.
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(file);
    else if (entry.name.endsWith('.html')) yield file;
  }
}

export const scriptHash = body => `'sha256-${createHash('sha256').update(body.replace(/\r\n?/g, '\n')).digest('base64')}'`;

export function inlineScripts(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter(([, attrs]) => !/\bsrc\s*=/i.test(attrs)).map(([, , body]) => body);
}

export function verifySecurityHeaders(dir) {
  const headers = readFileSync(path.join(dir, '_headers'), 'utf8');
  const csp = headers.match(/^  Content-Security-Policy: (.+)$/m)?.[1];
  if (!csp) throw new Error('Missing CSP');
  const scripts = csp.match(/(?:^|;)\s*script-src\s+([^;]+)/)?.[1];
  if (!scripts || scripts.includes('unsafe-inline') || scripts.includes('unsafe-eval')) throw new Error('Unsafe script policy');
  const allowed = new Set(scripts.split(/\s+/));
  let pages = 0, count = 0;
  for (const file of htmlFiles(dir)) {
    pages++;
    const html = readFileSync(file, 'utf8');
    for (const body of inlineScripts(html)) {
      count++;
      if (!allowed.has(scriptHash(body))) throw new Error(`Uncovered inline script: ${file}`);
    }
  }
  if (!pages) throw new Error('No HTML to protect');
  return {pages, inlineScripts: count, hashes: [...allowed].filter(s => s.startsWith("'sha256-")).length};
}

export function writeSecurityHeaders(dir) {
  const hashes = new Set();
  for (const file of htmlFiles(dir)) for (const body of inlineScripts(readFileSync(file, 'utf8'))) hashes.add(scriptHash(body));
  const csp = ["default-src 'self'", `script-src 'self' ${[...hashes].sort().join(' ')}`.trim(),
    "script-src-attr 'none'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data:", "font-src 'self' data:",
    "connect-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'"].join('; ');
  // Pages limits each header line to 2,000 characters. Fail rather than silently truncate hashes.
  const line = `  Content-Security-Policy: ${csp}`;
  if (Buffer.byteLength(line) > 2000) throw new Error('CSP exceeds the Pages header line limit');
  writeFileSync(path.join(dir, '_headers'), `/*\n${line}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Frame-Options: DENY\n  X-Robots-Tag: noindex\n`);
  return verifySecurityHeaders(dir);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(verifySecurityHeaders(path.resolve(process.argv[2] || 'build')));
