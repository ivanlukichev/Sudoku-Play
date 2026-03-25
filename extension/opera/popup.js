(function () {
  "use strict";

  var SITE_ROUTES = {
    home: "https://sudoku-play.org/",
    daily: "https://sudoku-play.org/daily-sudoku/",
    kids: "https://sudoku-play.org/sudoku-for-kids/",
    guide: "https://sudoku-play.org/guide/"
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
    var url = SITE_ROUTES[routeKey];
    if (!api || !url) {
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
