import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const extensionSrcDir = path.join(rootDir, "extension", "src");
const extensionDir = path.join(rootDir, "extension");
const publicJsDir = path.join(rootDir, "public", "assets", "js");

const packageJson = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
const extensionLinks = JSON.parse(await readFile(path.join(rootDir, "config", "extension-links.json"), "utf8"));

const VERSION = packageJson.version;
const ICON_SIZES = [16, 32, 48, 64, 128];
const BROWSER_OUTPUTS = [
  { name: "chrome", title: "Sudoku Play" },
  { name: "opera", title: "Sudoku Play" },
  { name: "firefox", title: "Sudoku Play" }
];

function toSiteConfigScript(config) {
  return [
    "(function () {",
    "  window.SUDOKU_PLAY_EXTENSION_LINKS = Object.freeze(" + JSON.stringify(config, null, 2) + ");",
    "})();",
    ""
  ].join("\n");
}

function buildManifest(browserName) {
  const manifest = {
    manifest_version: 3,
    name: "Sudoku Play",
    short_name: "Sudoku Play",
    version: VERSION,
    description: "Quickly open Sudoku Play, Daily Sudoku, and Kids Sudoku from your browser toolbar.",
    homepage_url: "https://sudoku-play.org/browser-extension/",
    icons: Object.fromEntries(ICON_SIZES.map((size) => [String(size), `./icons/icon-${size}.png`])),
    action: {
      default_title: "Sudoku Play",
      default_popup: "./popup.html",
      default_icon: Object.fromEntries(ICON_SIZES.map((size) => [String(size), `./icons/icon-${size}.png`]))
    }
  };

  if (browserName === "firefox") {
    manifest.browser_specific_settings = {
      gecko: {
        id: "addon@sudoku-play.org",
        strict_min_version: "121.0"
      }
    };
  }

  return manifest;
}

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

async function buildBrowserFolders() {
  const sharedFiles = ["popup.html", "popup.css", "popup.js"];

  for (const browser of BROWSER_OUTPUTS) {
    const targetDir = path.join(extensionDir, browser.name);
    await rm(targetDir, { recursive: true, force: true });
    await ensureDir(path.join(targetDir, "icons"));

    for (const fileName of sharedFiles) {
      await cp(path.join(extensionSrcDir, fileName), path.join(targetDir, fileName));
    }

    await cp(path.join(extensionSrcDir, "icons"), path.join(targetDir, "icons"), { recursive: true });
    await writeFile(
      path.join(targetDir, "manifest.json"),
      JSON.stringify(buildManifest(browser.name), null, 2) + "\n",
      "utf8"
    );
  }
}

async function buildSiteConfig() {
  await ensureDir(publicJsDir);
  const siteConfig = {
    infoPagePath: extensionLinks.infoPagePath || "/browser-extension/",
    chrome: extensionLinks.chrome || "",
    opera: extensionLinks.opera || "",
    firefox: extensionLinks.firefox || ""
  };
  await writeFile(path.join(publicJsDir, "extension-links.js"), toSiteConfigScript(siteConfig), "utf8");
}

await buildBrowserFolders();
await buildSiteConfig();
