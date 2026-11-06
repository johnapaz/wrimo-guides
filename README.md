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

Guides describe released, verified behavior only. Pull requests run `npm run check`, owner-mode isolation and a real-browser CSP and search test; nothing in this repository deploys.
