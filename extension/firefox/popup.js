(function () {
  "use strict";

  var ROUTES = {
    home: { path: "index.html" },
    daily: { url: "https://sudoku-play.org/daily-sudoku/" },
    kids: { url: "https://sudoku-play.org/sudoku-for-kids/" },
    guide: { url: "https://sudoku-play.org/guide/" }
  };

  function getExtensionApi() {
    if (typeof browser !== "undefined" && browser.tabs && typeof browser.tabs.create === "function") {
      return browser;
    }
    if (typeof chrome !== "undefined" && chrome.tabs && typeof chrome.tabs.create === "function") {
      return chrome;
    }
    return null;
  }

  function openRoute(routeKey) {
    var api = getExtensionApi();
    var route = ROUTES[routeKey];
    var url = "";
    if (!api || !route) {
      return;
    }
    if (route.url) {
      url = route.url;
    } else if (api.runtime && typeof api.runtime.getURL === "function") {
      url = api.runtime.getURL(route.path);
    }
    if (!url) {
      return;
    }
    api.tabs.create({ url: url });
    window.close();
  }

  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(document.querySelectorAll("[data-route]"), function (button) {
      button.addEventListener("click", function () {
        openRoute(button.getAttribute("data-route"));
      });
    });
  });
})();
