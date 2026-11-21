import {basename} from 'node:path';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import noInternalLinks from './src/remark/no-internal-links.mjs';
import {editUrl} from './source-repository.mjs';

// Canonical address; hosting and public release are separate operator decisions.
// Public mode is only for the standalone production release of docs.wrimo.co (D-41). Previews, the owner build and the
// copy embedded in the app under /docs/ stay noindex, so search engines see one canonical site.
const publicRelease = process.env.WRIMO_DOCS_PUBLIC === '1' && process.env.WRIMO_DOCS_OWNER !== '1' &&
  process.env.WRIMO_DOCS_BASE_URL !== '/docs/';
const PUBLIC_FOOTER = '© 2026 John Paz. All rights reserved.';
const PREVIEW_FOOTER = 'WriMo documentation preview. Not yet published.';
// Problems are reported as Issues on this public repository (John, Nov 20). The form warns against posting writing.
const REPORT_PROBLEM_URL = 'https://github.com/johnapaz/wrimo-guides/issues/new/choose';

const config: Config = {
  title: 'WriMo Docs',
  tagline: 'How to use WriMo',
  url: 'https://docs.wrimo.co',
  // The embedded help release uses /docs/; the standalone preview keeps /.
  baseUrl: process.env.WRIMO_DOCS_BASE_URL === '/docs/' ? '/docs/' : '/',
  noIndex: !publicRelease,
  trailingSlash: false,
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  onDuplicateRoutes: 'throw',
  markdown: {
    hooks: {onBrokenMarkdownLinks: 'throw', onBrokenMarkdownImages: 'throw'},
    preprocessor({filePath, fileContent}) {
      if (basename(filePath) !== 'whats-new-0-1-1.mdx') return fileContent;
      // GitHub renders the source's relative images. Docusaurus serves the same
      // files from its static directory at either the standalone or embedded base URL.
      const screenshots = /!\[([^\]\n]+)\]\(\.\.\/static\/images\/0\.1\.1\/([a-z-]+\.jpg)\)/g;
      const page = fileContent.replace(screenshots, (_, alt: string, file: string) =>
        `<img src={useBaseUrl('/images/0.1.1/${file}')} alt={${JSON.stringify(alt)}} width="1363" height="936" />`,
      );
      return page.replace(/^---\n[\s\S]*?\n---\n/, frontMatter =>
        `${frontMatter}\nimport useBaseUrl from '@docusaurus/useBaseUrl';\n`,
      );
    },
  },
  i18n: {defaultLocale: 'en', locales: ['en']},
  presets: [
    [
      'classic',
      {
        // docs/ is the only content source. Edit links require explicit owner mode.
        docs: {
          path: 'docs',
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          ...(process.env.WRIMO_DOCS_OWNER === '1'
            ? {editUrl}
            : {}),
          // Runs before Docusaurus resolves Markdown links, so an internal link fails with its own reason.
          beforeDefaultRemarkPlugins: [noInternalLinks],
        },
        blog: false,
        pages: false,
        // A sitemap only for the indexed production site.
        sitemap: publicRelease ? {changefreq: 'weekly', priority: 0.5} : false,
        theme: {customCss: './src/css/custom.css'},
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    navbar: {title: 'WriMo Docs'},
    footer: publicRelease
      ? {style: 'light', links: [{label: 'Report a problem', href: REPORT_PROBLEM_URL}], copyright: PUBLIC_FOOTER}
      : {style: 'light', copyright: PREVIEW_FOOTER},
    colorMode: {respectPrefersColorScheme: true},
  } satisfies Preset.ThemeConfig,
};

export default config;
