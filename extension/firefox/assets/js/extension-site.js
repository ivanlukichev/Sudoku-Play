(function () {
  "use strict";

  var config = window.SUDOKU_PLAY_EXTENSION_LINKS || {};
  var infoPagePath = config.infoPagePath || "/browser-extension/";
  var browserNames = {
    chrome: "Chrome",
    opera: "Opera",
    firefox: "Firefox"
  };

  function resolveUrl(browserKey) {
    return config[browserKey] || infoPagePath;
  }

  function resolveStatus(browserKey) {
    if (config[browserKey]) {
      return browserNames[browserKey] + " store link is ready.";
    }
    return browserNames[browserKey] + " store link coming soon.";
  }

  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(document.querySelectorAll("[data-extension-href]"), function (link) {
      var browserKey = link.getAttribute("data-extension-href");
      if (!browserNames[browserKey]) {
        return;
      }
      link.setAttribute("href", resolveUrl(browserKey));
      if (!config[browserKey]) {
        link.setAttribute("data-extension-fallback", "info-page");
      }
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-extension-status]"), function (node) {
      var browserKey = node.getAttribute("data-extension-status");
      if (!browserNames[browserKey]) {
        return;
      }
      node.textContent = resolveStatus(browserKey);
      node.classList.toggle("is-live", Boolean(config[browserKey]));
    });
  });
})();
