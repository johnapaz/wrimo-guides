# WriMo writer guides

How to write with [WriMo](https://wrimo.app), keep your work safe and get it back. These guides are built with Docusaurus 3.

On Node 24:

```sh
npm ci
npm run check   # typecheck, build, publication guard, tests, strict negative builds
npm start       # local preview
```

- `docs/` holds the guide pages. `docs/_partials/` holds shared snippets, which are not routed.
- `src/facts.ts` holds the shared labels and values the guides state about the app. The app's maintainers check them against app source before each guides update reaches the app.
- `scripts/publication-guard.mjs` scans the build for protected patterns, such as credentials, account or deployment identifiers, email addresses and internal links. Maintainers run additional private checks before publication.
- `src/remark/no-internal-links.mjs` fails the build on links outside `docs/`.

## Builds

| Command | Output | Use |
| --- | --- | --- |
| `npm run build` | `build/` | Previews and the copy embedded in the app. Not indexed. |
| `npm run build:owner` | `build-owner/` | Private owner previews with "Edit this page" links. Not indexed. |
| `npm run build:public` | `build-public/` | The public docs.wrimo.co release: indexed, with a sitemap, the rights footer, a "Report a problem" link and cookieless Cloudflare Web Analytics allowed by the CSP. |

Found a problem? [Report it](https://github.com/johnapaz/wrimo-guides/issues/new/choose). This repository is public, so never post your writing, files, passwords or tokens.

Guides describe released, verified behavior only. Pull requests run `npm run check`, owner-mode isolation and a real-browser CSP and search test; nothing in this repository deploys.
