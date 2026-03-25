(function () {
  "use strict";

  var SITE_ORIGIN = "https://sudoku-play.org";
  var LOCAL_ROUTE_MAP = {
    "/": "/index.html",
    "/daily-sudoku/": "/daily-sudoku/index.html",
    "/medium-sudoku/": "/medium-sudoku/index.html",
    "/hard-sudoku/": "/hard-sudoku/index.html",
    "/expert-sudoku/": "/expert-sudoku/index.html",
    "/sudoku-for-kids/": "/sudoku-for-kids/index.html",
    "/mini-sudoku/": "/mini-sudoku/index.html",
    "/picture-sudoku/": "/picture-sudoku/index.html",
    "/junior-sudoku/": "/junior-sudoku/index.html"
  };

  function getRuntime() {
    if (typeof browser !== "undefined" && browser.runtime && typeof browser.runtime.getURL === "function") {
      return browser.runtime;
    }
    if (typeof chrome !== "undefined" && chrome.runtime && typeof chrome.runtime.getURL === "function") {
      return chrome.runtime;
    }
    return null;
  }

  function getLocalPath(pathname) {
    return LOCAL_ROUTE_MAP[pathname] || pathname || "/index.html";
  }

  function searchParamsToObject(searchParams) {
    var params = {};
    searchParams.forEach(function (value, key) {
      params[key] = value;
    });
    return params;
  }

  function getLocalUrl(pathname, params, hash) {
    var runtime = getRuntime();
    var cleanPath = getLocalPath(pathname).replace(/^\//, "");
    var query = new URLSearchParams();
    var search = "";
    if (params) {
      Object.keys(params).forEach(function (key) {
        if (params[key]) {
          query.set(key, String(params[key]));
        }
      });
      search = query.toString();
    }
    if (runtime) {
      return runtime.getURL(cleanPath) + (search ? "?" + search : "") + (hash || "");
    }
    return "/" + cleanPath + (search ? "?" + search : "") + (hash || "");
  }

  function rewriteHref(rawHref) {
    var url;
    if (!rawHref || rawHref.charAt(0) === "#") {
      return rawHref;
    }
    try {
      url = new window.URL(rawHref, SITE_ORIGIN);
    } catch (error) {
      return rawHref;
    }
    if (url.origin !== SITE_ORIGIN) {
      return rawHref;
    }
    if (LOCAL_ROUTE_MAP[url.pathname]) {
      return getLocalUrl(url.pathname, searchParamsToObject(url.searchParams), url.hash);
    }
    return SITE_ORIGIN + url.pathname + url.search + url.hash;
  }

  function rewriteAnchors() {
    Array.prototype.forEach.call(document.querySelectorAll("a[href]"), function (anchor) {
      var currentHref = anchor.getAttribute("href");
      var nextHref = rewriteHref(currentHref);
      if (nextHref && nextHref !== currentHref) {
        anchor.setAttribute("href", nextHref);
      }
    });
  }

  window.SUDOKU_PLAY_EXTENSION_PAGE = {
    getLocalPath: getLocalPath,
    getLocalUrl: getLocalUrl,
    isExtensionPage: true,
    siteOrigin: SITE_ORIGIN
  };

  document.addEventListener("DOMContentLoaded", rewriteAnchors);
})();
