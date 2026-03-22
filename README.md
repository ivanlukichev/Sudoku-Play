# sudokus.org

Static Sudoku site prepared for Cloudflare Workers Static Assets.

## Project layout

- `public/` contains the deployable site files.
- `src/index.js` handles canonical-host redirects and shared response headers.
- `wrangler.jsonc` points Workers to the static assets and enables clean HTML routing.
- `.htaccess` is kept only as the legacy Apache reference.

## Local setup

1. Install dependencies with `npm install`.
2. Start a preview with `npm run dev`.
3. Deploy with `npm run deploy`.

## Notes

- The canonical production host is `sudoku-play.org`.
- Requests for `sudokus.org`, `www.sudokus.org`, and `www.sudoku-play.org` are redirected to the canonical host in the Worker.
