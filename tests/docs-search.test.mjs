import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {searchGuides} from '../src/docs-search.ts';

test('search finds rendered guide content, handles whitespace and misses', () => {
  const guides = JSON.parse(readFileSync('build/search-index.json', 'utf8'));
  const routes = ['/', '/projects', '/chapters', '/saving-and-backup', '/recovery', '/export', '/troubleshooting', '/privacy-and-ownership', '/limitations'];
  assert.equal(guides.length, routes.length);
  assert.deepEqual(new Set(guides.map(g => g.url)), new Set(routes));
  for (const guide of guides) assert.ok(existsSync(`build/${guide.url === '/' ? 'index' : guide.url.slice(1)}.html`));
  assert.ok(searchGuides(guides, '  SAVING   BACKUP  ').some(g => g.url === '/saving-and-backup'));
  // This phrase comes from a rendered shared partial, not a page-title keyword list.
  assert.ok(searchGuides(guides, 'within moments').some(g => g.url === '/'));
  assert.ok(searchGuides(guides, 'started before sign-in').some(g => g.url === '/projects'));
  assert.ok(searchGuides(guides, 'last successfully saved').some(g => g.url === '/export'));
  assert.ok(searchGuides(guides, 'GitHub sign-in').some(g => g.url === '/privacy-and-ownership'));
  assert.deepEqual(searchGuides(guides, 'unfindable-zzzz'), []);
  assert.deepEqual(searchGuides(guides, '   '), []);
  assert.ok(guides.every(g => !g.text.includes('Oh dang!')));
  assert.ok(guides.every(g => !g.text.includes('Edit this page')));
});
