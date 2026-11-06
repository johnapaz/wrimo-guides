import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import noInternalLinks from './src/remark/no-internal-links.mjs';
import {editUrl} from './source-repository.mjs';

// Canonical address; hosting and public release are separate operator decisions.
const config: Config = {
  title: 'WriMo Docs',
  tagline: 'How to use WriMo',
  url: 'https://docs.wrimo.co',
  // The embedded help release uses /docs/; the standalone preview keeps /.
  baseUrl: process.env.WRIMO_DOCS_BASE_URL === '/docs/' ? '/docs/' : '/',
  noIndex: true,
  trailingSlash: false,
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  onDuplicateRoutes: 'throw',
  markdown: {
    hooks: {onBrokenMarkdownLinks: 'throw', onBrokenMarkdownImages: 'throw'},
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
        sitemap: false,
        theme: {customCss: './src/css/custom.css'},
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    navbar: {title: 'WriMo Docs'},
    footer: {style: 'light', copyright: 'WriMo documentation preview. Not yet published.'},
    colorMode: {respectPrefersColorScheme: true},
  } satisfies Preset.ThemeConfig,
};

export default config;
