import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import config from '../docusaurus.config.ts';
import noInternalLinks, {internalLinkReason, publicDocsDir} from '../src/remark/no-internal-links.mjs';

const page = path.join(publicDocsDir, 'getting-started.mdx');

test('the build fails on broken links, anchors and Markdown links, and is not indexed', () => {
  assert.equal(config.url, 'https://docs.wrimo.co');
  assert.equal(config.noIndex, true);
  assert.equal(config.onBrokenLinks, 'throw');
  assert.equal(config.onBrokenAnchors, 'throw');
  assert.equal(config.markdown.hooks.onBrokenMarkdownLinks, 'throw');
  assert.equal(config.markdown.hooks.onBrokenMarkdownImages, 'throw');
});

test('website/docs/ is the only content source', () => {
  const [[name, options]] = config.presets;
  assert.equal(name, 'classic');
  assert.equal(options.docs.path, 'docs');
  assert.equal(options.blog, false);
  assert.equal(options.pages, false);
  assert.equal(options.docs.editUrl, undefined);
  assert.ok(options.docs.beforeDefaultRemarkPlugins.includes(noInternalLinks));
  assert.equal(config.plugins, undefined);
});

test('links into repo docs/ or the private repository are rejected', () => {
  for (const url of ['../../docs/internal-record.md', '../../docs/internal-record.md#x-1', '../facts.ts', '../../README.md',
    'https://github.com/johnapaz/writemo/blob/main/docs/internal-record.md', 'https://github.com/johnapaz/writemo/issues/35', '//github.com/johnapaz/writemo']) {
    assert.ok(internalLinkReason(url, page), url);
  }
  for (const url of ['./limitations.mdx', './saving-and-backup.mdx#exporting', '#know-what-is-saved', '/limitations', 'https://wrimo.app', 'https://github.com/johnapaz/writemo-public']) {
    assert.equal(internalLinkReason(url, page), null, url);
  }
});

test('the remark plugin throws on internal links in Markdown and JSX', () => {
  const run = tree => noInternalLinks()(tree, {path: page});
  assert.throws(() => run({type: 'root', children: [{type: 'paragraph', children: [{type: 'link', url: '../../docs/internal-record.md', children: []}]}]}), /Internal link/);
  assert.throws(() => run({type: 'root', children: [{type: 'mdxJsxFlowElement', name: 'a', attributes: [{type: 'mdxJsxAttribute', name: 'href', value: 'https://github.com/johnapaz/writemo'}], children: []}]}), /Internal link/);
  assert.doesNotThrow(() => run({type: 'root', children: [{type: 'link', url: './limitations.mdx', children: []}]}));
});
