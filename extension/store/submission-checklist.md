# Store Submission Checklist

## Assets

- `extension/chrome/`, `extension/opera/`, and `extension/firefox/` contain the browser-ready source folders.
- `public/assets/img/browser-extension/` contains the prepared screenshots and promo image assets.
- `extension/src/icons/` contains the generated extension icon sizes.

## Draft Copy

- Chrome Web Store: `extension/store/chrome-web-store.md`
- Opera Add-ons: `extension/store/opera-addons.md`
- Firefox Add-ons: `extension/store/firefox-addons.md`

## Before Publishing

- replace empty store URLs in `config/extension-links.json`
- run `npm run build:extensions`
- load each extension folder as an unpacked add-on and verify the popup actions
- upload screenshots and promo image from `public/assets/img/browser-extension/`
- add the published store links to the website and README via the same config
