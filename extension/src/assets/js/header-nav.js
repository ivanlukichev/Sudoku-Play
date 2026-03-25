(function () {
  "use strict";

  var PREFERENCES_KEY = "sudokus_preferences_v2";
  var MODE_META = [
    {
      key: "dyslexia",
      label: "Dyslexia mode",
      className: "mode-dyslexia",
      guidePath: "/guide/dyslexia-friendly-sudoku/",
      icon: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 11.5a5.5 5.5 0 0 1 9.3-4l1.2 1.2H20v7h-2v-1.6h-2.9l-1.4 1.4A5.5 5.5 0 1 1 4 11.5Zm5.5-3.5a3.5 3.5 0 1 0 2.5 6l2-2h4v-1.5h-4.8l-2.6-2.6A3.5 3.5 0 0 0 9.5 8Zm9.5 2.5h1v3h-1v-3Z\" fill=\"currentColor\"/></svg>"
    },
    {
      key: "rowHighlight",
      label: "Row and column highlight",
      className: "mode-row-highlight",
      guidePath: "/guide/sudoku-row-column-highlight/",
      icon: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M10.75 4h2.5v6.75H20v2.5h-6.75V20h-2.5v-6.75H4v-2.5h6.75V4Z\" fill=\"currentColor\"/></svg>"
    },
    {
      key: "focus",
      label: "Soft focus mode",
      className: "mode-focus",
      guidePath: "/guide/sudoku-focus-mode/",
      icon: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 5.25a6.75 6.75 0 1 0 6.75 6.75A6.76 6.76 0 0 0 12 5.25Zm0 11a4.25 4.25 0 1 1 4.25-4.25A4.25 4.25 0 0 1 12 16.25ZM11 2h2v3h-2V2Zm0 17h2v3h-2v-3ZM2 11h3v2H2v-2Zm17 0h3v2h-3v-2Z\" fill=\"currentColor\"/></svg>"
    },
    {
      key: "warm",
      label: "Warm night theme",
      className: "mode-warm",
      guidePath: "/guide/sudoku-night-mode/",
      icon: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M14.9 3.3A8.9 8.9 0 1 0 20.7 17 8 8 0 1 1 14.9 3.3Z\" fill=\"currentColor\"/></svg>"
    }
  ];

  function loadPreferences() {
    try {
      return JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) || "{}") || {};
    } catch (error) {
      return {};
    }
  }

  function savePreferences(nextPreferences) {
    try {
      window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(nextPreferences));
    } catch (error) {
      return;
    }
  }

  function loadUiState() {
    var preferences = loadPreferences();
    return {
      theme: preferences.theme === "dark" ? "dark" : "light",
      dyslexia: Boolean(preferences.modeDyslexia),
      rowHighlight: preferences.modeRowHighlight !== false,
      focus: Boolean(preferences.modeFocus),
      warm: Boolean(preferences.modeWarm)
    };
  }

  function persistUiState(uiState) {
    var preferences = loadPreferences();
    preferences.theme = uiState.theme === "dark" ? "dark" : "light";
    preferences.modeDyslexia = Boolean(uiState.dyslexia);
    preferences.modeRowHighlight = Boolean(uiState.rowHighlight);
    preferences.modeFocus = Boolean(uiState.focus);
    preferences.modeWarm = Boolean(uiState.warm);
    savePreferences(preferences);
  }

  function getCurrentUiState() {
    return {
      theme: document.body.classList.contains("theme-dark") ? "dark" : "light",
      dyslexia: document.body.classList.contains("mode-dyslexia"),
      rowHighlight: document.body.classList.contains("mode-row-highlight"),
      focus: document.body.classList.contains("mode-focus"),
      warm: document.body.classList.contains("mode-warm")
    };
  }

  function syncBrandLogos(uiState) {
    var useDarkLogo = uiState.theme === "dark" || Boolean(uiState.warm);
    document.querySelectorAll(".brand__logo").forEach(function (logo) {
      var kind;
      var nextSrc;
      if (!logo.dataset.logoKind) {
        kind = (logo.getAttribute("src") || "").indexOf("kids") !== -1 ? "kids" : "classic";
        logo.dataset.logoKind = kind;
      } else {
        kind = logo.dataset.logoKind;
      }

      nextSrc = kind === "kids"
        ? (useDarkLogo ? "/assets/img/logo-full-kids-dark.svg" : "/assets/img/logo-full-kids.svg")
        : (useDarkLogo ? "/assets/img/logo-full-dark.svg" : "/assets/img/logo-full.svg");

      if (logo.getAttribute("src") !== nextSrc) {
        logo.setAttribute("src", nextSrc);
      }
    });
  }

  function applyUiState(uiState) {
    var normalizedTheme = uiState.theme === "dark" ? "dark" : "light";
    if (!document.body) {
      return;
    }

    document.body.classList.toggle("theme-dark", normalizedTheme === "dark");
    document.body.classList.toggle("mode-dyslexia", Boolean(uiState.dyslexia));
    document.body.classList.toggle("mode-row-highlight", Boolean(uiState.rowHighlight));
    document.body.classList.toggle("mode-focus", Boolean(uiState.focus));
    document.body.classList.toggle("mode-warm", Boolean(uiState.warm));
    document.body.setAttribute("data-theme", normalizedTheme);
    document.documentElement.setAttribute("data-theme", normalizedTheme);

    document.querySelectorAll("[data-visual-theme]").forEach(function (button) {
      var isDark = normalizedTheme === "dark";
      var label = button.querySelector("[data-theme-label]");
      button.classList.toggle("is-active", isDark);
      button.setAttribute("aria-pressed", isDark ? "true" : "false");
      if (label) {
        label.textContent = isDark ? "Night" : "Day";
      }
    });

    MODE_META.forEach(function (mode) {
      document.querySelectorAll("[data-a11y-mode='" + mode.key + "']").forEach(function (button) {
        var isActive = Boolean(uiState[mode.key]);
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    });

    syncBrandLogos({
      theme: normalizedTheme,
      warm: Boolean(uiState.warm)
    });
  }

  function dispatchThemeChange(theme) {
    document.dispatchEvent(new CustomEvent("sudokus:themechange", {
      detail: {
        theme: theme === "dark" ? "dark" : "light"
      }
    }));
  }

  function setTheme(theme) {
    var nextState = getCurrentUiState();
    nextState.theme = theme === "dark" ? "dark" : "light";
    applyUiState(nextState);
    persistUiState(nextState);
    dispatchThemeChange(nextState.theme);
  }

  function toggleMode(modeKey) {
    var nextState = getCurrentUiState();
    nextState[modeKey] = !nextState[modeKey];
    applyUiState(nextState);
    persistUiState(nextState);
  }

  function closeMenu(bar, button) {
    bar.classList.remove("is-nav-open");
    button.setAttribute("aria-expanded", "false");
  }

  function openMenu(bar, button) {
    bar.classList.add("is-nav-open");
    button.setAttribute("aria-expanded", "true");
  }

  function closeA11y(panel, button) {
    panel.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
  }

  function openA11y(panel, button) {
    panel.classList.add("is-open");
    button.setAttribute("aria-expanded", "true");
  }

  function buildModesMarkup() {
    return MODE_META.map(function (mode) {
      return "" +
        "<div class=\"a11y-mode-item\">" +
          "<button class=\"a11y-mode-button\" type=\"button\" data-a11y-mode=\"" + mode.key + "\" aria-pressed=\"false\" title=\"" + mode.label + "\" aria-label=\"" + mode.label + "\">" +
            "<span class=\"a11y-mode-button__icon\">" + mode.icon + "</span>" +
            "<span class=\"a11y-mode-button__label\">" + mode.label + "</span>" +
          "</button>" +
          "<a class=\"a11y-mode-help\" href=\"" + mode.guidePath + "\" title=\"Learn more about this mode\" aria-label=\"Learn more about " + mode.label + "\">?</a>" +
        "</div>";
    }).join("");
  }

  function buildVisualMarkup() {
    return "" +
      "<div class=\"a11y-mode-item a11y-mode-item--theme\">" +
        "<button class=\"a11y-mode-button a11y-mode-button--theme\" type=\"button\" data-visual-theme aria-pressed=\"false\" title=\"Toggle day and night theme\" aria-label=\"Toggle day and night theme\">" +
          "<span class=\"a11y-mode-button__icon a11y-mode-button__icon--theme\" aria-hidden=\"true\">" +
            "<span class=\"theme-glyph\">" +
              "<span class=\"theme-glyph__sun\">☀</span>" +
              "<span class=\"theme-glyph__moon\">☾</span>" +
            "</span>" +
          "</span>" +
          "<span class=\"a11y-mode-button__label\">Theme</span>" +
          "<span class=\"a11y-mode-button__meta\" data-theme-label>Day</span>" +
        "</button>" +
      "</div>" +
      buildModesMarkup();
  }

  function setupHeaderControls() {
    document.querySelectorAll(".site-header__bar").forEach(function (bar, index) {
      var brand = bar.querySelector(".brand");
      var nav = bar.querySelector(".site-nav");
      var tools;
      var menuButton;
      var visualBox;
      var visualToggle;
      var visualPanel;
      var navId;
      var visualId;

      if (!brand || !nav || bar.querySelector(".site-header__tools")) {
        return;
      }

      navId = nav.id || ("site-nav-" + (index + 1));
      nav.id = navId;
      visualId = "site-visual-" + (index + 1);

      tools = document.createElement("div");
      tools.className = "site-header__tools";

      visualBox = document.createElement("div");
      visualBox.className = "a11y-modes a11y-modes--visual";
      visualBox.innerHTML = "" +
        "<button class=\"a11y-modes__toggle\" type=\"button\" aria-label=\"Visual modes\" aria-controls=\"" + visualId + "\" aria-expanded=\"false\">" +
          "<span class=\"a11y-modes__toggle-glyph\" aria-hidden=\"true\">" +
            "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 5.25c4.66 0 8.18 2.78 10 6.75-1.82 3.97-5.34 6.75-10 6.75S3.82 15.97 2 12c1.82-3.97 5.34-6.75 10-6.75Zm0 10.5A3.75 3.75 0 1 0 8.25 12 3.76 3.76 0 0 0 12 15.75Zm0-2A1.75 1.75 0 1 1 13.75 12 1.75 1.75 0 0 1 12 13.75Z\" fill=\"currentColor\"/></svg>" +
            "<span class=\"a11y-modes__toggle-dot\"></span>" +
          "</span>" +
          "<span class=\"a11y-modes__toggle-label\">Visual modes</span>" +
        "</button>" +
        "<div class=\"a11y-modes__list\" id=\"" + visualId + "\" aria-label=\"Visual modes\">" + buildVisualMarkup() + "</div>";

      menuButton = document.createElement("button");
      menuButton.className = "site-nav__toggle";
      menuButton.type = "button";
      menuButton.setAttribute("aria-controls", navId);
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open site menu");
      menuButton.innerHTML = "" +
        "<span class=\"site-nav__toggle-glyph\" aria-hidden=\"true\">" +
          "<span class=\"site-nav__toggle-line\"></span>" +
          "<span class=\"site-nav__toggle-line\"></span>" +
          "<span class=\"site-nav__toggle-line\"></span>" +
          "<span class=\"site-nav__toggle-dot\"></span>" +
        "</span>";

      tools.appendChild(visualBox);
      tools.appendChild(menuButton);
      nav.insertAdjacentElement("afterend", tools);

      visualBox.querySelector("[data-visual-theme]").addEventListener("click", function () {
        setTheme(document.body.classList.contains("theme-dark") ? "light" : "dark");
      });

      visualToggle = visualBox.querySelector(".a11y-modes__toggle");
      visualPanel = visualBox.querySelector(".a11y-modes__list");

      visualToggle.addEventListener("click", function () {
        if (visualBox.classList.contains("is-open")) {
          closeA11y(visualBox, visualToggle);
        } else {
          closeMenu(bar, menuButton);
          openA11y(visualBox, visualToggle);
        }
      });

      visualPanel.querySelectorAll("[data-a11y-mode]").forEach(function (button) {
        button.addEventListener("click", function () {
          toggleMode(button.getAttribute("data-a11y-mode"));
        });
      });

      menuButton.addEventListener("click", function () {
        if (bar.classList.contains("is-nav-open")) {
          closeMenu(bar, menuButton);
        } else {
          closeA11y(visualBox, visualToggle);
          openMenu(bar, menuButton);
        }
      });

      nav.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          closeMenu(bar, menuButton);
          closeA11y(visualBox, visualToggle);
        });
      });

      document.addEventListener("click", function (event) {
        if (!bar.contains(event.target)) {
          closeMenu(bar, menuButton);
          closeA11y(visualBox, visualToggle);
        }
      });

      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          closeMenu(bar, menuButton);
          closeA11y(visualBox, visualToggle);
        }
      });

      window.addEventListener("resize", function () {
        if (window.innerWidth > 959) {
          closeMenu(bar, menuButton);
          closeA11y(visualBox, visualToggle);
        }
      });
    });
  }

  function init() {
    applyUiState(loadUiState());
    setupHeaderControls();
    applyUiState(loadUiState());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}());
