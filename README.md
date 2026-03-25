# Sudoku Play

Sudoku Play is a free online Sudoku project with classic puzzles, Daily Sudoku, kids-friendly modes, solving guides, and browser extension builds for Chrome, Opera, and Firefox.

Live website: [sudoku-play.org](https://sudoku-play.org/)

GitHub repository: [ivanlukichev/Sudoku-Play](https://github.com/ivanlukichev/Sudoku-Play)

## Features

- Play Sudoku online with Easy, Medium, Hard, and Expert difficulty levels
- Daily Sudoku with one shared puzzle per day
- Kids Sudoku modes including Mini Sudoku, Picture Sudoku, and Junior Sudoku
- Printable puzzles from the in-game print flow
- Guide articles covering rules, tips, strategies, and beginner help
- Browser extension source and store-prep assets for Chrome, Opera, and Firefox

## Browser Extensions

Sudoku Play now includes a browser extension product layer built around a shared popup UI and browser-specific manifests.

- Chrome extension: Coming soon
- Opera extension: Coming soon
- Firefox extension: Coming soon

The shared extension source lives in `extension/src/`, and `npm run build:extensions` generates browser-ready folders in:

- `extension/chrome/`
- `extension/opera/`
- `extension/firefox/`

Store URLs are centralized in `config/extension-links.json`, which also drives the website install buttons.

Source links:

- Extension folder: [extension/](https://github.com/ivanlukichev/Sudoku-Play/tree/main/extension)
- Shared popup source: [extension/src/](https://github.com/ivanlukichev/Sudoku-Play/tree/main/extension/src)

## Repository Structure

- `public/` contains the deployable website files
- `public/browser-extension/` contains the browser extension landing page
- `public/guide/` contains guide and SEO support content, including the browser extension article
- `public/assets/` contains shared CSS, JavaScript, and image assets
- `extension/src/` contains the shared popup source and icon source files
- `extension/chrome/`, `extension/opera/`, `extension/firefox/` contain generated extension builds
- `extension/store/` contains store listing copy and submission notes
- `config/extension-links.json` stores extension store URLs and fallback routing
- `scripts/build-extensions.mjs` generates extension manifests and the website extension-link config
- `src/index.js` is the Cloudflare Worker entry used for redirects and response headers
- `wrangler.jsonc` contains the Cloudflare Workers configuration

## Local Development

1. Install dependencies with `npm install`.
2. Start the local preview with `npm run dev`.
3. Rebuild browser extension outputs after changing extension source or store URLs with `npm run build:extensions`.
4. Deploy the website with `npm run deploy`.

## Browser Extension Workflow

1. Update `config/extension-links.json` when store URLs are available.
2. Run `npm run build:extensions`.
3. Load `extension/chrome/`, `extension/opera/`, or `extension/firefox/` as unpacked extensions for testing.
4. Use the store copy in `extension/store/` and the media in `public/assets/img/browser-extension/` during submission.

## License

This repository does not currently include a license file.
