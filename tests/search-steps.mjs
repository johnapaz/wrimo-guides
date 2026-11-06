import assert from 'node:assert/strict';

// Shared by the standalone build (csp-browser.test.mjs) and the embedded /docs/ build (../tests/browser-docs-search.test.ts).
// `scope` is the search form's container; `label` its input label.
export async function exerciseSearch(page, scope, label) {
  const input = scope.getByLabel(label, {exact: true});
  const button = scope.getByRole('button', {name: 'Search', exact: true});
  const status = scope.getByRole('status');
  await input.fill('saved locally');
  await input.press('Enter');
  await status.filter({hasText: /guides? found/}).waitFor();
  assert.ok(await scope.getByRole('list', {name: 'Search results'}).getByRole('link').count() >= 1);
  await input.fill('zzzzmissingtermzzzz');
  await button.click();
  await status.filter({hasText: 'No guides found'}).waitFor();
  await page.route('**/search-index.json', route => route.fulfill({status: 503, body: '{}'}));
  await input.fill('backup');
  await button.click();
  await status.filter({hasText: 'Search is unavailable'}).waitFor();
  await page.unroute('**/search-index.json');
  await button.click();
  await status.filter({hasText: /guides? found/}).waitFor();
}
