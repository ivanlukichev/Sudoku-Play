const CANONICAL_HOST = "sudoku-play.org";
const LEGACY_HOSTS = new Set([
  "sudokus.org",
  "www.sudokus.org",
  "www.sudoku-play.org"
]);

const IMMUTABLE_ASSET_PATTERN =
  /\.(?:css|js|mjs|svg|png|jpg|jpeg|webp|gif|ico|woff2?)$/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const canonicalRedirect = getCanonicalRedirect(url);

    if (canonicalRedirect) {
      return Response.redirect(canonicalRedirect, 301);
    }

    const response = await env.ASSETS.fetch(request);
    return applyResponseHeaders(response, url.pathname);
  }
};

function getCanonicalRedirect(url) {
  const hostname = url.hostname.toLowerCase();

  if (LEGACY_HOSTS.has(hostname)) {
    url.hostname = CANONICAL_HOST;
    url.protocol = "https:";
    return url.toString();
  }

  return null;
}

function applyResponseHeaders(response, pathname) {
  const headers = new Headers(response.headers);

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (isHtmlResponse(headers)) {
    headers.set("Cache-Control", "no-cache, must-revalidate");
  } else if (IMMUTABLE_ASSET_PATTERN.test(pathname)) {
    headers.set("Cache-Control", "public, max-age=2592000, immutable");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function isHtmlResponse(headers) {
  const contentType = headers.get("content-type") || "";
  return contentType.includes("text/html");
}
