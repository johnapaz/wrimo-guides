import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const plainText = html => html.replace(/<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]*>/g, ' ').replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, entity => ({'&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' '})[entity])
  .replace(/\s+/g, ' ').trim();

// Index rendered doc articles, including resolved facts and partials. Theme pages
// (such as 404), navigation, scripts and private repository records are excluded.
export function writeSearchIndex(buildDir, baseUrl = '/') {
  const guides = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith('.html')) {
        const html = readFileSync(file, 'utf8');
        const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];
        const heading = article?.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
        if (!article || !heading) continue;
        const relative = path.relative(buildDir, file).split(path.sep).join('/');
        guides.push({title: plainText(heading), url: relative === 'index.html' ? baseUrl : `${baseUrl}${relative.replace(/\.html$/, '')}`, text: plainText(article)});
      }
    }
  }
  walk(buildDir);
  writeFileSync(path.join(buildDir, 'search-index.json'), JSON.stringify(guides));
}
