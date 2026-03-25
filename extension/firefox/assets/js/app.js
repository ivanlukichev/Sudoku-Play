(function () {
  "use strict";

  var EXTENSION_PAGE = window.SUDOKU_PLAY_EXTENSION_PAGE || null;

  var DIFFICULTY_ORDER = ["easy", "medium", "hard", "expert"];
  var DIFFICULTY_META = {
    easy: {
      label: "Easy",
      intro: "A calm starting board with clearer openings and a gentler pace."
    },
    medium: {
      label: "Medium",
      intro: "A balanced puzzle with fewer obvious moves and a steadier solving rhythm."
    },
    hard: {
      label: "Hard",
      intro: "A tighter grid that rewards patient note-taking and deeper elimination."
    },
    expert: {
      label: "Expert",
      intro: "A sparse board for players who want a serious logic workout."
    }
  };
  var STORAGE_KEYS = {
    preferences: "sudokus_preferences_v2",
    bestTimes: "sudokus_best_times_v1"
  };
  var PREPARED_PUZZLES = null;
  var MIN_PUZZLE_ID = 1000;
  var MAX_PUZZLE_ID = 100000000;
  var ALLOWED_QUERY_KEYS = ["p"];
  var ROUTE_BY_DIFFICULTY = {
    easy: "/easy-sudoku/",
    medium: "/medium-sudoku/",
    hard: "/hard-sudoku/",
    expert: "/expert-sudoku/"
  };
  var DAILY_ROUTE = "/daily-sudoku/";
  var BUTTON_ICONS = {
    share: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M14 5h5v5h-2V8.41l-5.29 5.3-1.42-1.42L15.59 7H14V5Zm3 14H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5v2H7v9h9v-4h2v5a1 1 0 0 1-1 1Z\" fill=\"currentColor\"/></svg>",
    print: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M7 4h10v4H7V4Zm10 10h2v-3a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v3h2v5h10v-5Zm-2 3H9v-5h6v5Zm2-9V3H7v5H4a2 2 0 0 0-2 2v5h3v6h14v-6h3v-5a2 2 0 0 0-2-2h-3Z\" fill=\"currentColor\"/></svg>"
  };
  var SOLVED_MESSAGES = [
    "Great solving!",
    "Nice logic!",
    "Well done!",
    "Sudoku master!",
    "Sharp thinking!",
    "Perfect grid!"
  ];

  function loadJson(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      return;
    }
  }

  function loadPreferences() {
    var prefs = loadJson(STORAGE_KEYS.preferences, {});
    return {
      theme: prefs.theme === "dark" ? "dark" : "light",
      noMistakes: Boolean(prefs.noMistakes),
      speedMode: Boolean(prefs.speedMode),
      lastDifficulty: DIFFICULTY_META[prefs.lastDifficulty] ? prefs.lastDifficulty : null
    };
  }

  function savePreferences(preferences) {
    var existing = loadJson(STORAGE_KEYS.preferences, {});
    saveJson(STORAGE_KEYS.preferences, Object.assign({}, existing, preferences));
  }

  function loadBestTimes() {
    return loadJson(STORAGE_KEYS.bestTimes, {});
  }

  function saveBestTimes(bestTimes) {
    saveJson(STORAGE_KEYS.bestTimes, bestTimes);
  }

  function applyTheme(theme) {
    if (!document.body) {
      return;
    }
    document.body.classList.toggle("theme-dark", theme === "dark");
    document.body.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
  }

  function formatTime(seconds) {
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var secs = seconds % 60;
    if (hours > 0) {
      return [hours, minutes, secs].map(function (value) {
        return String(value).padStart(2, "0");
      }).join(":");
    }
    return [minutes, secs].map(function (value) {
      return String(value).padStart(2, "0");
    }).join(":");
  }

  function setButtonLabel(button, type, label, options) {
    var settings = options || {};
    if (!button) {
      return;
    }
    button.innerHTML =
      "<span class=\"button-icon\" aria-hidden=\"true\">" + BUTTON_ICONS[type] + "</span>" +
      "<span class=\"button-label\">" + label + "</span>";
    button.classList.add("button-with-icon");
    if (settings.iconOnlyOnMobile) {
      button.classList.add("button--icon-only-mobile");
    }
    if (settings.ariaLabel) {
      button.setAttribute("aria-label", settings.ariaLabel);
    }
    if (settings.title) {
      button.setAttribute("title", settings.title);
    }
  }

  function getCellLabel(index, cell) {
    var row = Math.floor(index / 9) + 1;
    var column = (index % 9) + 1;
    if (cell.given) {
      return "Row " + row + ", column " + column + ", fixed value " + cell.value;
    }
    if (cell.value) {
      return "Row " + row + ", column " + column + ", value " + cell.value;
    }
    if (cell.notes.length) {
      return "Row " + row + ", column " + column + ", notes " + cell.notes.join(", ");
    }
    return "Row " + row + ", column " + column + ", empty";
  }

  function createNotesMarkup(notes) {
    var slots = "";
    var value;
    for (value = 1; value <= 9; value += 1) {
      slots += "<span>" + (notes.indexOf(value) !== -1 ? value : "") + "</span>";
    }
    return "<span class=\"cell__notes\" aria-hidden=\"true\">" + slots + "</span>";
  }

  function getDifficultyMeta(difficulty) {
    return DIFFICULTY_META[difficulty] || DIFFICULTY_META.easy;
  }

  function buildDifficultyTabsMarkup(isDaily, currentDifficulty) {
    var markup = "";
    DIFFICULTY_ORDER.forEach(function (difficulty) {
      var meta = getDifficultyMeta(difficulty);
      var isCurrent = difficulty === currentDifficulty;
      markup += "<button" +
        (isCurrent ? " class=\"is-current\"" : "") +
        " type=\"button\" data-select-difficulty=\"" + difficulty + "\"" +
        " aria-pressed=\"" + (isCurrent ? "true" : "false") + "\"" +
        (isDaily ? " disabled" : "") +
        ">" + meta.label + "</button>";
    });
    return markup;
  }

  function getCurrentPathname() {
    try {
      return normalizePathname(new window.URL(window.location.href).pathname || "/");
    } catch (error) {
      return "/";
    }
  }

  function normalizePathname(pathname) {
    var cleanPath = pathname || "/";
    if (/\/index\.html$/.test(cleanPath)) {
      cleanPath = cleanPath.replace(/index\.html$/, "");
    }
    return cleanPath === "/index.html" ? "/" : cleanPath;
  }

  function getHistoryPathname(pathname) {
    var cleanPath = normalizePathname(pathname);
    if (EXTENSION_PAGE && typeof EXTENSION_PAGE.getLocalPath === "function") {
      return EXTENSION_PAGE.getLocalPath(cleanPath);
    }
    return cleanPath;
  }

  function getRouteForDifficulty(difficulty, preferHomeForEasy) {
    if (difficulty === "easy" && preferHomeForEasy) {
      return "/";
    }
    return ROUTE_BY_DIFFICULTY[difficulty] || "/";
  }

  function normalizePuzzleId(rawValue) {
    var normalized = String(rawValue || "").trim();
    var numericId;
    if (!/^\d{1,9}$/.test(normalized)) {
      return null;
    }
    numericId = Number(normalized);
    if (!Number.isFinite(numericId) || numericId < MIN_PUZZLE_ID || numericId > MAX_PUZZLE_ID) {
      return null;
    }
    return String(numericId);
  }

  function getCurrentUrlObject() {
    try {
      return new window.URL(window.location.href);
    } catch (error) {
      return null;
    }
  }

  function getTodayDailyPuzzleId() {
    var today = new Date();
    var year = today.getUTCFullYear();
    var month = String(today.getUTCMonth() + 1).padStart(2, "0");
    var date = String(today.getUTCDate()).padStart(2, "0");
    return String(year) + month + date;
  }

  function getAllowedParamsFromUrl(url) {
    var rawPuzzleId;
    var normalizedPuzzleId;
    var hasPuzzleParam = false;
    if (!url || !url.searchParams) {
      return {
        p: null,
        invalidRawId: null,
        hasPuzzleParam: false
      };
    }
    rawPuzzleId = url.searchParams.get("p");
    hasPuzzleParam = url.searchParams.has("p");
    normalizedPuzzleId = normalizePuzzleId(rawPuzzleId);
    return {
      p: normalizedPuzzleId,
      invalidRawId: hasPuzzleParam && !normalizedPuzzleId ? rawPuzzleId : null,
      hasPuzzleParam: hasPuzzleParam && Boolean(normalizedPuzzleId)
    };
  }

  function buildCleanRelativeUrl(pathname, params, hash) {
    var search = [];
    var cleanPath = pathname || "/";
    ALLOWED_QUERY_KEYS.forEach(function (key) {
      if (params && params[key]) {
        search.push(key + "=" + encodeURIComponent(String(params[key])));
      }
    });
    return cleanPath + (search.length ? "?" + search.join("&") : "") + (hash || "");
  }

  function buildCleanAbsoluteUrl(pathname, params, hash) {
    var url = getCurrentUrlObject();
    var origin = EXTENSION_PAGE && EXTENSION_PAGE.siteOrigin
      ? EXTENSION_PAGE.siteOrigin
      : (url ? url.origin : "https://sudoku-play.org");
    return origin + buildCleanRelativeUrl(normalizePathname(pathname), params, hash);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getSolvedMessage(seed) {
    var numericSeed = Number(seed) || 0;
    return SOLVED_MESSAGES[Math.abs(numericSeed) % SOLVED_MESSAGES.length];
  }

  function buildSolvedModalMarkup(config) {
    var titleId = config.titleId || "sudoku-win-title";
    if (config.isDaily) {
      return "" +
        "<h2 id=\"" + titleId + "\">Sudoku Solved!</h2>" +
        "<p>You completed today's daily Sudoku.</p>" +
        "<p class=\"modal__detail\">Difficulty: <strong data-modal-difficulty>Medium</strong></p>" +
        "<p class=\"modal__detail\">" + escapeHtml(config.puzzleLabel || "Puzzle ID") + ": <strong data-modal-puzzle-id>1001</strong></p>" +
        "<p class=\"modal__detail\" data-modal-time-row>Time: <strong data-modal-time>00:00</strong></p>" +
        "<p class=\"modal__detail\" data-modal-best-row hidden>Best time: <strong data-modal-best-time>00:00</strong></p>" +
        "<p class=\"modal__praise\" data-modal-praise>Great solving!</p>" +
        "<div class=\"modal__actions\">" +
          "<button class=\"cta-button button-with-icon\" type=\"button\" data-action=\"copy-link\" data-modal-copy-link aria-label=\"Share this puzzle\" title=\"Share this puzzle\"><span class=\"button-icon\" aria-hidden=\"true\">" + BUTTON_ICONS.share + "</span><span class=\"button-label\">Share</span></button>" +
          "<button class=\"cta-button button-with-icon\" type=\"button\" data-action=\"print-puzzle\" data-modal-next aria-label=\"Print this puzzle\" title=\"Print this puzzle\"><span class=\"button-icon\" aria-hidden=\"true\">" + BUTTON_ICONS.print + "</span><span class=\"button-label\">Print</span></button>" +
        "</div>";
    }
    return "" +
      "<h2 id=\"" + titleId + "\">Sudoku Solved!</h2>" +
      "<p>You completed the Sudoku board.</p>" +
      "<p class=\"modal__detail\">Difficulty: <strong data-modal-difficulty>" + escapeHtml(config.difficultyLabel || "Easy") + "</strong></p>" +
      "<p class=\"modal__detail\">Sudoku ID: <strong data-modal-puzzle-id>1001</strong></p>" +
      "<p class=\"modal__detail\" data-modal-time-row>Time: <strong data-modal-time>00:00</strong></p>" +
      "<p class=\"modal__detail\" data-modal-best-row hidden>Best time: <strong data-modal-best-time>00:00</strong></p>" +
      "<p class=\"modal__praise\" data-modal-praise>Great solving!</p>" +
      "<div class=\"modal__actions\">" +
        "<button class=\"cta-button cta-button--primary\" type=\"button\" data-action=\"next-puzzle\" data-modal-next>Next Sudoku →</button>" +
        "<button class=\"cta-button button-with-icon\" type=\"button\" data-action=\"copy-link\" data-modal-copy-link aria-label=\"Share this puzzle\" title=\"Share this puzzle\"><span class=\"button-icon\" aria-hidden=\"true\">" + BUTTON_ICONS.share + "</span><span class=\"button-label\">Share</span></button>" +
        "<button class=\"cta-button button-with-icon\" type=\"button\" data-action=\"print-puzzle\" aria-label=\"Print this puzzle\" title=\"Print this puzzle\"><span class=\"button-icon\" aria-hidden=\"true\">" + BUTTON_ICONS.print + "</span><span class=\"button-label\">Print</span></button>" +
      "</div>";
  }

  var qrLibraryPromise = null;

  function loadQrLibrary() {
    var existingScript;
    if (window.QRCode) {
      return Promise.resolve(window.QRCode);
    }
    if (qrLibraryPromise) {
      return qrLibraryPromise;
    }
    qrLibraryPromise = new Promise(function (resolve, reject) {
      existingScript = document.querySelector("script[data-qr-library]");
      if (existingScript) {
        existingScript.addEventListener("load", function () {
          resolve(window.QRCode);
        }, { once: true });
        existingScript.addEventListener("error", function () {
          reject(new Error("Unable to load the local QR library."));
        }, { once: true });
        return;
      }

      existingScript = document.createElement("script");
      existingScript.src = "/assets/js/qrcode.min.js";
      existingScript.async = true;
      existingScript.defer = true;
      existingScript.dataset.qrLibrary = "true";
      existingScript.onload = function () {
        resolve(window.QRCode);
      };
      existingScript.onerror = function () {
        reject(new Error("Unable to load the local QR library."));
      };
      document.head.appendChild(existingScript);
    });
    return qrLibraryPromise;
  }

  function buildQrImageDataUrl(value, size) {
    var safeSize = Math.max(120, Number(size) || 144);
    var container;
    var img;
    var canvas;
    if (!window.QRCode) {
      return "";
    }
    container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "-9999px";
    document.body.appendChild(container);
    try {
      new window.QRCode(container, {
        text: String(value || ""),
        width: safeSize,
        height: safeSize,
        colorDark: "#111111",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.M
      });
      img = container.querySelector("img");
      if (img && img.getAttribute("src")) {
        return img.getAttribute("src");
      }
      canvas = container.querySelector("canvas");
      if (canvas) {
        return canvas.toDataURL("image/png");
      }
      return "";
    } finally {
      container.remove();
    }
  }

  function buildPrintQrMarkup(value, size, puzzleId) {
    var dataUrl = buildQrImageDataUrl(value, size);
    if (dataUrl) {
      return "<img src=\"" + escapeHtml(dataUrl) + "\" alt=\"QR code for puzzle " + escapeHtml(puzzleId) + "\" data-print-qr>";
    }
    return "<div class=\"print-qr__fallback\">Open online:<br>" + escapeHtml(value) + "</div>";
  }

  function createSeededRandom(seed) {
    var state = (Number(seed) || 1) >>> 0;
    return function () {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function shuffleWithRandom(values, random) {
    var copy = values.slice();
    var index;
    var swapIndex;
    var temp;
    for (index = copy.length - 1; index > 0; index -= 1) {
      swapIndex = Math.floor(random() * (index + 1));
      temp = copy[index];
      copy[index] = copy[swapIndex];
      copy[swapIndex] = temp;
    }
    return copy;
  }

  function createAxisOrder(random) {
    var groups = shuffleWithRandom([0, 1, 2], random);
    var order = [];
    groups.forEach(function (group) {
      shuffleWithRandom([0, 1, 2], random).forEach(function (offset) {
        order.push(group * 3 + offset);
      });
    });
    return order;
  }

  function createDigitMap(random) {
    var digits = shuffleWithRandom([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
    var map = ["0"];
    digits.forEach(function (digit, index) {
      map[index + 1] = String(digit);
    });
    return map;
  }

  function transformGridString(board, rowOrder, columnOrder, digitMap, transpose) {
    var output = [];
    var row;
    var column;
    var sourceRow;
    var sourceColumn;
    var value;
    for (row = 0; row < 9; row += 1) {
      for (column = 0; column < 9; column += 1) {
        sourceRow = transpose ? columnOrder[row] : rowOrder[row];
        sourceColumn = transpose ? rowOrder[column] : columnOrder[column];
        value = board.charAt(sourceRow * 9 + sourceColumn);
        output.push(value === "0" ? "0" : digitMap[Number(value)]);
      }
    }
    return output.join("");
  }

  function buildPuzzleFromId(rawId, fallbackDifficulty) {
    var normalized = normalizePuzzleId(rawId);
    var numericId;
    var difficulty;
    var bank;
    var basePuzzle;
    var random;
    var rowOrder;
    var columnOrder;
    var digitMap;
    var transpose;

    initializePuzzleCatalog();
    if (!normalized) {
      return null;
    }
    numericId = Number(normalized);

    difficulty = DIFFICULTY_META[fallbackDifficulty] ? fallbackDifficulty : "easy";
    bank = PREPARED_PUZZLES[difficulty] || [];
    if (!bank.length) {
      return null;
    }

    basePuzzle = bank[(numericId - 1) % bank.length];
    random = createSeededRandom(numericId);
    rowOrder = createAxisOrder(random);
    columnOrder = createAxisOrder(random);
    digitMap = createDigitMap(random);
    transpose = random() > 0.5;

    return {
      id: difficulty + "-seed-" + normalized,
      numericId: normalized,
      difficulty: difficulty,
      order: numericId,
      seed: numericId,
      baseId: basePuzzle.id,
      puzzle: transformGridString(basePuzzle.puzzle, rowOrder, columnOrder, digitMap, transpose),
      solution: transformGridString(basePuzzle.solution, rowOrder, columnOrder, digitMap, transpose)
    };
  }

  function getRandomPuzzleIdForDifficulty(excludeNumericId, previousNumericId) {
    var candidate = MIN_PUZZLE_ID + Math.floor(Math.random() * (MAX_PUZZLE_ID - MIN_PUZZLE_ID + 1));
    while (candidate === Number(excludeNumericId) || candidate === Number(previousNumericId)) {
      candidate = MIN_PUZZLE_ID + Math.floor(Math.random() * (MAX_PUZZLE_ID - MIN_PUZZLE_ID + 1));
    }
    return String(candidate);
  }

  function getNextPuzzleIdForDifficulty(currentNumericId) {
    var current = Number(currentNumericId);
    if (!Number.isFinite(current) || current < MIN_PUZZLE_ID || current > MAX_PUZZLE_ID) {
      return String(MIN_PUZZLE_ID);
    }
    return String(current >= MAX_PUZZLE_ID ? MIN_PUZZLE_ID : current + 1);
  }

  function initializePuzzleCatalog() {
    if (PREPARED_PUZZLES) {
      return PREPARED_PUZZLES;
    }

    PREPARED_PUZZLES = {};
    DIFFICULTY_ORDER.forEach(function (difficulty) {
      var bank = (window.SUDOKUS_PUZZLES && window.SUDOKUS_PUZZLES[difficulty]) || [];
      PREPARED_PUZZLES[difficulty] = bank.map(function (puzzle, index) {
        return {
          id: puzzle.id,
          puzzle: puzzle.puzzle,
          solution: puzzle.solution,
          difficulty: difficulty,
          order: index
        };
      });
    });

    return PREPARED_PUZZLES;
  }

  function getPuzzleFromLocation(fallbackDifficulty) {
    var allowed;
    var puzzle;
    var url;
    try {
      url = getCurrentUrlObject();
      allowed = getAllowedParamsFromUrl(url);
      if (!allowed.p) {
        return {
          puzzle: null,
          invalidRawId: allowed.invalidRawId,
          hasPuzzleParam: false
        };
      }
      puzzle = buildPuzzleFromId(allowed.p, fallbackDifficulty);
      return {
        puzzle: puzzle,
        invalidRawId: puzzle ? null : allowed.invalidRawId,
        hasPuzzleParam: Boolean(puzzle)
      };
    } catch (error) {
      return {
        puzzle: null,
        invalidRawId: null,
        hasPuzzleParam: false
      };
    }
  }

  function updateLocationState(difficulty, puzzleId, preferHomeForEasy, includePuzzleParam) {
    var url;
    var params = {};
    try {
      url = getCurrentUrlObject();
      if (!url) {
        return;
      }
      if (includePuzzleParam && normalizePuzzleId(puzzleId)) {
        params.p = normalizePuzzleId(puzzleId);
      }
      window.history.replaceState({}, "", buildCleanRelativeUrl(getHistoryPathname(getRouteForDifficulty(difficulty, preferHomeForEasy)), params, url.hash));
    } catch (error) {
      return;
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      var field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "absolute";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      try {
        document.execCommand("copy");
        document.body.removeChild(field);
        resolve();
      } catch (error) {
        document.body.removeChild(field);
        reject(error);
      }
    });
  }

  function ScreenPager(root) {
    this.root = root;
    this.track = root.querySelector("[data-screen-track]");
    this.contentScroll = root.querySelector(".screen-content__scroll");
    this.currentScreen = "game";
    this.bindEvents();
    this.showScreen("game", false);
  }

  ScreenPager.prototype.bindEvents = function () {
    var self = this;
    this.root.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-screen-target]");
      if (!trigger) {
        return;
      }
      event.preventDefault();
      self.showScreen(trigger.getAttribute("data-screen-target"), true);
    });
  };

  ScreenPager.prototype.showScreen = function (screenName, shouldFocus) {
    var offset = screenName === "content" ? "-50%" : "0";
    var focusTarget;
    this.currentScreen = screenName === "content" ? "content" : "game";
    if (this.currentScreen === "content" && this.contentScroll) {
      this.contentScroll.scrollTop = 0;
    }
    if (this.track) {
      this.track.style.transform = "translate3d(0, " + offset + ", 0)";
    }
    document.body.setAttribute("data-active-screen", this.currentScreen);

    if (!shouldFocus) {
      return;
    }

    focusTarget = this.root.querySelector("[data-screen-focus='" + this.currentScreen + "']");
    if (focusTarget) {
      window.setTimeout(function () {
        focusTarget.focus();
      }, 420);
    }
  };

  function setupTwoScreenLayout() {
    var main = document.getElementById("main");
    var hero = main && main.querySelector(".hero");
    var divider = main && main.querySelector(".divider");
    var content = main && main.querySelector(".content-section");
    var footer = document.querySelector("body > .site-footer");
    var track;
    var contentScreen;
    var contentScroll;
    var screenButton;
    var backWrap;
    var focusHeading;
    var heroShell;
    var focusGameHeading;

    if (!main || !hero || !content || !divider || !footer || main.hasAttribute("data-screen-shell")) {
      return;
    }

    document.body.classList.add("app-page");
    if (!document.body.getAttribute("data-active-screen")) {
      document.body.setAttribute("data-active-screen", "game");
    }

    hero.classList.add("page-screen", "screen-game");
    hero.querySelectorAll(".helper-card").forEach(function (card) {
      card.remove();
    });

    focusGameHeading = hero.querySelector("h1");
    if (focusGameHeading && !focusGameHeading.getAttribute("data-screen-focus")) {
      focusGameHeading.setAttribute("data-screen-focus", "game");
      focusGameHeading.setAttribute("tabindex", "-1");
    }

    heroShell = hero.querySelector(".site-shell");
    if (heroShell && !heroShell.querySelector(".screen-game__cta")) {
      screenButton = document.createElement("div");
      screenButton.className = "screen-game__cta";
      screenButton.innerHTML = "<button class=\"screen-toggle\" type=\"button\" data-screen-target=\"content\" aria-label=\"Learn more about Sudoku\"><span class=\"screen-toggle__icon\" aria-hidden=\"true\">↓</span><span class=\"screen-toggle__copy\"><span class=\"screen-toggle__title\">Learn Sudoku</span><span class=\"screen-toggle__meta\">About the Game</span></span></button>";
      heroShell.appendChild(screenButton);
    }

    contentScreen = document.createElement("section");
    contentScreen.className = "page-screen screen-content";
    contentScreen.setAttribute("aria-label", "Sudoku guide and FAQ");

    contentScroll = document.createElement("div");
    contentScroll.className = "screen-content__scroll";
    contentScreen.appendChild(contentScroll);

    backWrap = document.createElement("div");
    backWrap.className = "screen-content__back";
    backWrap.innerHTML = "<button class=\"screen-toggle\" type=\"button\" data-screen-target=\"game\" data-screen-focus=\"content\" aria-label=\"Back to Sudoku game\"><span class=\"screen-toggle__icon\" aria-hidden=\"true\">↑</span><span class=\"screen-toggle__copy\"><span class=\"screen-toggle__title\">Back to Sudoku</span><span class=\"screen-toggle__meta\">Return to the puzzle</span></span></button>";
    contentScroll.appendChild(backWrap);
    contentScroll.appendChild(divider);
    contentScroll.appendChild(content);
    contentScroll.appendChild(footer);
    track = document.createElement("div");
    track.className = "page-track";
    track.setAttribute("data-screen-track", "");
    track.appendChild(hero);
    track.appendChild(contentScreen);

    main.classList.add("page-shell");
    main.setAttribute("data-screen-shell", "");
    while (main.firstChild) {
      main.removeChild(main.firstChild);
    }
    main.appendChild(track);
  }

  function SudokuApp(root) {
    this.root = root;
    this.catalog = initializePuzzleCatalog();
    this.preferences = loadPreferences();
    this.bestTimes = loadBestTimes();
    this.config = {
      initialDifficulty: root.getAttribute("data-initial-difficulty") || "easy",
      mode: root.getAttribute("data-game-mode") || "standard",
      fixedDifficulty: root.getAttribute("data-fixed-difficulty") || "",
      routePath: root.getAttribute("data-route-path") || "",
      puzzleLabel: root.getAttribute("data-puzzle-label") || "Puzzle ID"
    };
    this.isDaily = this.config.mode === "daily";
    this.routePath = this.config.routePath || (this.isDaily ? DAILY_ROUTE : "");
    this.fixedDifficulty = DIFFICULTY_META[this.config.fixedDifficulty] ? this.config.fixedDifficulty : "";
    this.preferHomeForEasy = !this.isDaily && getCurrentPathname() === "/";
    this.currentDifficulty = this.fixedDifficulty || (DIFFICULTY_META[this.config.initialDifficulty] ? this.config.initialDifficulty : "easy");
    this.requestedPuzzleState = this.isDaily
      ? {
        puzzle: buildPuzzleFromId(getTodayDailyPuzzleId(), this.currentDifficulty),
        invalidRawId: null,
        hasPuzzleParam: false
      }
      : getPuzzleFromLocation(this.currentDifficulty);
    this.requestedPuzzle = this.requestedPuzzleState.puzzle;
    this.invalidRequestedPuzzleId = this.requestedPuzzleState.invalidRawId;
    this.hasExplicitPuzzleParam = this.requestedPuzzleState.hasPuzzleParam;
    if (this.requestedPuzzle) {
      this.currentDifficulty = this.requestedPuzzle.difficulty;
    }

    this.intervalId = null;
    this.elapsed = 0;
    this.notesMode = false;
    this.history = [];
    this.selectedIndex = 0;
    this.currentPuzzle = null;
    this.lastPuzzleIdByDifficulty = {};
    this.solved = false;
    this.cells = [];
    this.cellButtons = [];
    this.transientErrorIndex = null;
    this.transientErrorTimer = null;
    this.copyResetTimer = null;

    this.ensureGameUi();

    this.boardEl = root.querySelector("[data-board]");
    this.timerEl = root.querySelector("[data-timer]");
    this.timerWrap = root.querySelector("[data-timer-card]");
    this.statusEl = root.querySelector("[data-status]");
    this.mobileStatusEl = root.querySelector("[data-mobile-status]");
    this.notesButton = root.querySelector("[data-action='notes']");
    this.mobileNotesButton = root.querySelector("[data-mobile-action='notes']");
    this.newGameButton = root.querySelector("[data-action='new-game']");
    this.gameTitleEl = root.querySelector("[data-game-title]");
    this.gameIntroEl = root.querySelector("[data-game-intro]");
    this.gameBadgeEl = root.querySelector("[data-game-badge]");
    this.liveRegion = root.querySelector("[data-live]");
    this.currentLevelEl = root.querySelector("[data-current-level]");
    this.mobileCurrentLevelEl = root.querySelector("[data-mobile-current-level]");
    this.leadEl = root.querySelector("[data-game-intro]");
    this.modal = document.querySelector("[data-modal]");
    this.modalTime = this.modal ? this.modal.querySelector("[data-modal-time]") : null;
    this.modalBestTime = this.modal ? this.modal.querySelector("[data-modal-best-time]") : null;
    this.modalPuzzleId = this.modal ? this.modal.querySelector("[data-modal-puzzle-id]") : null;
    this.modalTimeRow = this.modal ? this.modal.querySelector("[data-modal-time-row]") : null;
    this.modalBestRow = this.modal ? this.modal.querySelector("[data-modal-best-row]") : null;
    this.modalDifficulty = this.modal ? this.modal.querySelector("[data-modal-difficulty]") : null;
    this.modalPraise = this.modal ? this.modal.querySelector("[data-modal-praise]") : null;
    this.modalCopyLink = this.modal ? this.modal.querySelector("[data-modal-copy-link]") : null;
    this.puzzleIdValue = this.root.querySelector("[data-puzzle-id]");
    this.mobilePuzzleIdValue = this.root.querySelector("[data-mobile-puzzle-id]");
    this.bestTimeValue = this.root.querySelector("[data-best-time]");
    this.mobileBestTimeValue = this.root.querySelector("[data-mobile-best-time]");
    this.bestTimeCard = this.root.querySelector("[data-best-time-card]");
    this.mobileBestTimeCard = this.root.querySelector("[data-mobile-best-time-card]");
    this.modeSummaryEl = this.root.querySelector("[data-mode-summary]");
    this.mobileModeSummaryEl = this.root.querySelector("[data-mobile-mode-summary]");
    this.mobileSummaryEl = this.root.querySelector("[data-mobile-summary]");
    this.mobileTimerEl = this.root.querySelector("[data-mobile-timer]");
    this.mobileTimerCard = this.root.querySelector("[data-mobile-timer-card]");
    this.copyLinkButton = this.root.querySelector("[data-action='copy-link']");
    this.mobileCopyLinkButton = this.root.querySelector("[data-mobile-action='copy-link']");
    this.noMistakesToggle = this.root.querySelector("[data-toggle='no-mistakes']");
    this.mobileNoMistakesToggle = this.root.querySelector("[data-mobile-action='toggle-no-mistakes']");
    this.speedModeToggle = this.root.querySelector("[data-toggle='speed-mode']");
    this.mobileSpeedModeToggle = this.root.querySelector("[data-mobile-action='toggle-speed']");
    this.difficultyButtons = Array.prototype.slice.call(root.querySelectorAll("[data-select-difficulty]"));

    setButtonLabel(this.copyLinkButton, "share", "Share", {
      ariaLabel: "Share this puzzle",
      title: "Share this puzzle",
      iconOnlyOnMobile: false
    });
    setButtonLabel(this.mobileCopyLinkButton, "share", "Share", {
      ariaLabel: "Share this puzzle",
      title: "Share this puzzle",
      iconOnlyOnMobile: true
    });
    setButtonLabel(this.root.querySelector("[data-action='print-puzzle']"), "print", "Print", {
      ariaLabel: "Print this puzzle",
      title: "Print this puzzle",
      iconOnlyOnMobile: false
    });
    setButtonLabel(this.root.querySelector("[data-mobile-action='print-puzzle']"), "print", "Print", {
      ariaLabel: "Print this puzzle",
      title: "Print this puzzle",
      iconOnlyOnMobile: true
    });
    setButtonLabel(this.modalCopyLink, "share", "Share", {
      ariaLabel: "Share this puzzle",
      title: "Share this puzzle",
      iconOnlyOnMobile: false
    });
    setButtonLabel(this.modal ? this.modal.querySelector("[data-action='print-puzzle']") : null, "print", "Print", {
      ariaLabel: "Print this puzzle",
      title: "Print this puzzle",
      iconOnlyOnMobile: false
    });

    this.bindEvents();
    this.buildBoard();
    this.applyPreferenceUi();
    this.startNewGame(this.requestedPuzzle, {
      forcePuzzle: true,
      includePuzzleParam: this.hasExplicitPuzzleParam
    });
    document.addEventListener("sudokus:themechange", function (event) {
      var nextTheme = event && event.detail && event.detail.theme === "dark" ? "dark" : "light";
      if (this.preferences.theme === nextTheme) {
        return;
      }
      this.preferences.theme = nextTheme;
      savePreferences(this.preferences);
      this.applyPreferenceUi();
    }.bind(this));
    if (this.invalidRequestedPuzzleId) {
      this.setStatus("Invalid puzzle ID. Loaded a random " + this.getDifficultyLabel().toLowerCase() + " puzzle.");
    }
  }

  SudokuApp.prototype.ensureGameUi = function () {
    var top = this.root.querySelector(".app-card__top");
    var title = this.root.querySelector("[data-game-title]");
    var lead = this.root.querySelector("[data-game-intro]");
    var badge = this.root.querySelector("[data-game-badge]");
    var difficultyTabs = this.root.querySelector(".difficulty-tabs");
    var playArea = this.root.querySelector(".play-area");
    var boardPanel = this.root.querySelector(".board-panel");
    var boardWrap = this.root.querySelector(".board-wrap");
    var numberPad = this.root.querySelector(".number-pad");
    var controls = this.root.querySelector(".app-controls");
    var statusLine = this.root.querySelector("[data-status]");
    var helperCard = this.root.querySelector(".helper-card");
    var newGameButton = this.root.querySelector("[data-action='new-game']");
    var undoButton = this.root.querySelector("[data-action='undo']");
    var eraseButton = this.root.querySelector("[data-action='erase']");
    var notesButton = this.root.querySelector("[data-action='notes']");
    var hintButton = this.root.querySelector("[data-action='hint']");
    var copyLinkButton = this.root.querySelector("[data-action='copy-link']");
    var printButton = this.root.querySelector("[data-action='print-puzzle']");
    var settingsStrip = this.root.querySelector(".game-settings");
    var leftSidebar;
    var leftPrimary;
    var leftSettings;
    var rightSidebar;
    var rightTop;
    var rightInfo;
    var rightActions;
    var heading;
    var timerCard;
    var bestCard;
    var modeCard;
    var ctaWrap = document.querySelector(".screen-game__cta");
    var ctaButton = ctaWrap ? ctaWrap.querySelector(".screen-toggle") : null;
    var modal = this.root.querySelector("[data-modal]");
    var modalCard;
    var modalTitleId = "sudoku-win-title";
    var mobilePanel;

    if (!playArea || !boardPanel || !boardWrap || !numberPad || !difficultyTabs) {
      return;
    }

    if (!modal) {
      modal = document.createElement("div");
      modal.className = "modal";
      modal.setAttribute("data-modal", "");
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", modalTitleId);
      modal.innerHTML = "<div class=\"modal__card\">" +
        buildSolvedModalMarkup({
          titleId: modalTitleId,
          isDaily: this.isDaily,
          puzzleLabel: this.config.puzzleLabel,
          difficultyLabel: this.getDifficultyLabel()
        }) +
      "</div>";
      document.body.appendChild(modal);
    }

    if (modal && modal.parentNode !== document.body) {
      document.body.appendChild(modal);
    }

    if (helperCard) {
      helperCard.remove();
    }

    if (badge) {
      badge.remove();
    }

    if (lead) {
      lead.classList.add("sr-only");
    }

    if (!copyLinkButton) {
      copyLinkButton = document.createElement("button");
      copyLinkButton.className = "action-button action-button--compact";
      copyLinkButton.type = "button";
      copyLinkButton.setAttribute("data-action", "copy-link");
      setButtonLabel(copyLinkButton, "share", "Share", {
        ariaLabel: "Share this puzzle",
        title: "Share this puzzle"
      });
    }

    if (!printButton) {
      printButton = document.createElement("button");
      printButton.className = "action-button action-button--compact";
      printButton.type = "button";
      printButton.setAttribute("data-action", "print-puzzle");
      setButtonLabel(printButton, "print", "Print", {
        ariaLabel: "Print this puzzle",
        title: "Print this puzzle"
      });
    }

    if (!settingsStrip) {
      settingsStrip = document.createElement("div");
      settingsStrip.className = "game-settings";
      settingsStrip.setAttribute("aria-label", "Game settings");
      settingsStrip.innerHTML = "" +
        "<button class=\"setting-chip\" type=\"button\" data-action=\"toggle-no-mistakes\" data-toggle=\"no-mistakes\" aria-pressed=\"false\">No mistakes</button>" +
        "<button class=\"setting-chip\" type=\"button\" data-action=\"toggle-speed\" data-toggle=\"speed-mode\" aria-pressed=\"false\">Speed mode</button>";
    }

    if (!this.root.querySelector(".game-sidebar--left")) {
      leftSidebar = document.createElement("aside");
      leftSidebar.className = "game-sidebar game-sidebar--left";
      leftSidebar.setAttribute("aria-label", "Sudoku controls");

      leftPrimary = document.createElement("div");
      leftPrimary.className = "game-sidebar__group game-sidebar__group--primary";
      if (newGameButton && !this.isDaily) {
        newGameButton.textContent = "New Puzzle";
        leftPrimary.appendChild(newGameButton);
      }
      [undoButton, eraseButton, notesButton, hintButton].forEach(function (button) {
        if (button) {
          leftPrimary.appendChild(button);
        }
      });
      if (controls) {
        controls.remove();
      }
      leftSidebar.appendChild(leftPrimary);

      leftSettings = document.createElement("div");
      leftSettings.className = "game-sidebar__group game-sidebar__group--settings";
      leftSettings.appendChild(settingsStrip);
      leftSidebar.appendChild(leftSettings);

      rightSidebar = document.createElement("aside");
      rightSidebar.className = "game-sidebar game-sidebar--right";
      rightSidebar.setAttribute("aria-label", "Current puzzle information");

      rightTop = document.createElement("div");
      rightTop.className = "game-sidebar__group game-sidebar__group--top";
      heading = document.createElement("div");
      heading.className = "game-hud-heading";
      heading.innerHTML = "<span class=\"game-hud-heading__eyebrow\">Sudoku-Play.org</span>";
      if (title) {
        title.classList.add("game-hud-heading__title");
        heading.appendChild(title);
      } else {
        heading.innerHTML += "<h2 class=\"game-hud-heading__title\" data-game-title>Sudoku</h2>";
      }
      rightTop.appendChild(heading);

      rightInfo = document.createElement("div");
      rightInfo.className = "game-hud";
      rightInfo.innerHTML = "" +
        "<div class=\"hud-card\"><span class=\"hud-card__label\">Difficulty</span><strong class=\"hud-card__value\" data-current-level>Easy</strong></div>" +
        "<div class=\"hud-card\"><span class=\"hud-card__label\">" + this.config.puzzleLabel + "</span><strong class=\"hud-card__value\" data-puzzle-id>1001</strong></div>" +
        "<div class=\"hud-card hud-card--timer\" data-timer-card><span class=\"hud-card__label\">Time</span><strong class=\"hud-card__value\" data-timer>00:00</strong></div>" +
        "<div class=\"hud-card\" data-best-time-card hidden><span class=\"hud-card__label\">Best</span><strong class=\"hud-card__value\" data-best-time>00:00</strong></div>" +
        "<div class=\"hud-card hud-card--status\"><span class=\"hud-card__label\">Status</span><p class=\"status-line\" data-status>Sudoku is ready.</p></div>" +
        "<div class=\"hud-card\"><span class=\"hud-card__label\">Modes</span><p class=\"hud-card__copy\" data-mode-summary>No mistakes: Off · Speed mode: Off</p></div>";
      rightTop.appendChild(rightInfo);
      rightSidebar.appendChild(rightTop);

      rightActions = document.createElement("div");
      rightActions.className = "game-sidebar__group game-sidebar__group--actions";
      printButton.classList.add("action-button--compact");
      rightActions.appendChild(printButton);
      copyLinkButton.classList.add("action-button--compact");
      rightActions.appendChild(copyLinkButton);
      rightSidebar.appendChild(rightActions);

      playArea.insertBefore(leftSidebar, boardPanel);
      playArea.appendChild(rightSidebar);

      if (difficultyTabs.parentNode !== boardPanel) {
        boardPanel.insertBefore(difficultyTabs, boardPanel.firstChild);
      }
      if (this.isDaily) {
        difficultyTabs.classList.add("is-hidden");
        difficultyTabs.setAttribute("aria-hidden", "true");
      }
      if (statusLine) {
        statusLine.remove();
      }
      if (controls) {
        controls.remove();
      }
      if (boardWrap.parentNode !== boardPanel) {
        boardPanel.appendChild(boardWrap);
      }
      if (numberPad.parentNode !== boardPanel) {
        boardPanel.appendChild(numberPad);
      }
      if (top) {
        top.remove();
      }
      if (ctaWrap) {
        ctaWrap.classList.add("screen-game__cta--floating");
      }
    }

    mobilePanel = this.root.querySelector(".mobile-game-panel");
    if (!mobilePanel) {
      mobilePanel = document.createElement("details");
      mobilePanel.className = "mobile-game-panel";
      mobilePanel.innerHTML = "" +
        "<summary class=\"mobile-game-panel__summary\">" +
          "<span class=\"mobile-game-panel__title\">Game menu</span>" +
          "<span class=\"mobile-game-panel__meta\" data-mobile-summary>Easy · #1001</span>" +
        "</summary>" +
        "<div class=\"mobile-game-panel__body\">" +
          (this.isDaily ? "" : "<div class=\"difficulty-tabs difficulty-tabs--mobile\" role=\"toolbar\" aria-label=\"Sudoku difficulty levels\">" + buildDifficultyTabsMarkup(false, this.currentDifficulty) + "</div>") +
          "<div class=\"mobile-game-panel__stats\">" +
            "<div class=\"hud-card\"><span class=\"hud-card__label\">Difficulty</span><strong class=\"hud-card__value\" data-mobile-current-level>Easy</strong></div>" +
            "<div class=\"hud-card\"><span class=\"hud-card__label\">" + this.config.puzzleLabel + "</span><strong class=\"hud-card__value\" data-mobile-puzzle-id>1001</strong></div>" +
            "<div class=\"hud-card hud-card--timer\" data-mobile-timer-card><span class=\"hud-card__label\">Time</span><strong class=\"hud-card__value\" data-mobile-timer>00:00</strong></div>" +
            "<div class=\"hud-card\" data-mobile-best-time-card hidden><span class=\"hud-card__label\">Best</span><strong class=\"hud-card__value\" data-mobile-best-time>--:--</strong></div>" +
            "<div class=\"hud-card hud-card--status mobile-game-panel__status\"><span class=\"hud-card__label\">Status</span><p class=\"status-line\" data-mobile-status>Sudoku is ready.</p></div>" +
            "<div class=\"hud-card mobile-game-panel__modes\"><span class=\"hud-card__label\">Modes</span><p class=\"hud-card__copy\" data-mobile-mode-summary>No mistakes: Off · Speed mode: Off</p></div>" +
          "</div>" +
          "<div class=\"mobile-game-panel__actions\">" +
            (this.isDaily ? "" : "<button class=\"action-button action-button--compact\" type=\"button\" data-mobile-action=\"new-game\">New Puzzle</button>") +
            "<button class=\"action-button action-button--compact\" type=\"button\" data-mobile-action=\"undo\">Undo</button>" +
            "<button class=\"action-button action-button--compact\" type=\"button\" data-mobile-action=\"erase\">Erase</button>" +
            "<button class=\"action-button action-button--compact\" type=\"button\" data-mobile-action=\"notes\">Notes</button>" +
            "<button class=\"action-button action-button--compact\" type=\"button\" data-mobile-action=\"hint\">Hint</button>" +
            "<button class=\"action-button action-button--compact button-with-icon button--icon-only-mobile\" type=\"button\" data-mobile-action=\"print-puzzle\" aria-label=\"Print this puzzle\" title=\"Print this puzzle\"><span class=\"button-icon\" aria-hidden=\"true\">" + BUTTON_ICONS.print + "</span><span class=\"button-label\">Print</span></button>" +
            "<button class=\"action-button action-button--compact button-with-icon button--icon-only-mobile\" type=\"button\" data-mobile-action=\"copy-link\" aria-label=\"Share this puzzle\" title=\"Share this puzzle\"><span class=\"button-icon\" aria-hidden=\"true\">" + BUTTON_ICONS.share + "</span><span class=\"button-label\">Share</span></button>" +
          "</div>" +
          "<div class=\"mobile-game-panel__settings\">" +
            "<button class=\"setting-chip\" type=\"button\" data-mobile-action=\"toggle-no-mistakes\" aria-pressed=\"false\">No mistakes</button>" +
            "<button class=\"setting-chip\" type=\"button\" data-mobile-action=\"toggle-speed\" aria-pressed=\"false\">Speed mode</button>" +
          "</div>" +
        "</div>";
      boardPanel.insertBefore(mobilePanel, boardPanel.firstChild);
    }

    timerCard = this.root.querySelector("[data-timer-card]");
    bestCard = this.root.querySelector("[data-best-time-card]");
    modeCard = this.root.querySelector("[data-mode-summary]");
    if (timerCard) {
      timerCard.classList.add("timer");
    }
    if (bestCard) {
      bestCard.classList.add("hud-card--best");
    }
    if (modeCard) {
      modeCard.classList.add("hud-card__copy");
    }

    if (modal) {
      modal.setAttribute("aria-labelledby", modalTitleId);
      modalCard = modal.querySelector(".modal__card");
      if (modalCard) {
        if (this.isDaily) {
          modalCard.innerHTML = buildSolvedModalMarkup({
            titleId: modalTitleId,
            isDaily: true,
            puzzleLabel: this.config.puzzleLabel,
            difficultyLabel: "Medium"
          });
        } else {
          modalCard.innerHTML = buildSolvedModalMarkup({
            titleId: modalTitleId,
            isDaily: false,
            puzzleLabel: this.config.puzzleLabel,
            difficultyLabel: this.getDifficultyLabel()
          });
        }
      }
    }
  };

  SudokuApp.prototype.refreshModalRefs = function () {
    if (!this.modal) {
      this.modal = this.root.querySelector("[data-modal]") || document.querySelector("[data-modal]");
    }
    if (!this.modal) {
      return;
    }
    if (this.modal.parentNode !== document.body) {
      document.body.appendChild(this.modal);
    }
    this.modalTime = this.modal.querySelector("[data-modal-time]");
    this.modalBestTime = this.modal.querySelector("[data-modal-best-time]");
    this.modalPuzzleId = this.modal.querySelector("[data-modal-puzzle-id]");
    this.modalTimeRow = this.modal.querySelector("[data-modal-time-row]");
    this.modalBestRow = this.modal.querySelector("[data-modal-best-row]");
    this.modalDifficulty = this.modal.querySelector("[data-modal-difficulty]");
    this.modalPraise = this.modal.querySelector("[data-modal-praise]");
    this.modalCopyLink = this.modal.querySelector("[data-modal-copy-link]");
  };

  SudokuApp.prototype.getRoutePath = function (difficulty) {
    if (this.routePath) {
      return this.routePath;
    }
    return getRouteForDifficulty(difficulty || this.currentDifficulty, this.preferHomeForEasy);
  };

  SudokuApp.prototype.syncPageLocation = function (includePuzzleParam) {
    var url;
    var params = {};
    try {
      url = getCurrentUrlObject();
      if (!url) {
        return;
      }
      if (!this.isDaily && includePuzzleParam && this.currentPuzzle && normalizePuzzleId(this.currentPuzzle.numericId)) {
        params.p = normalizePuzzleId(this.currentPuzzle.numericId);
      }
      window.history.replaceState({}, "", buildCleanRelativeUrl(getHistoryPathname(this.getRoutePath(this.currentDifficulty)), params, url.hash));
    } catch (error) {
      return;
    }
  };

  SudokuApp.prototype.syncCanonicalUrl = function () {
    var canonical = document.querySelector("link[rel='canonical']");
    var ogUrl = document.querySelector("meta[property='og:url']");
    var robots = document.querySelector("meta[name='robots']");
    var params = {};
    var hasSeedUrl = false;
    var route;
    if (!this.isDaily && this.hasExplicitPuzzleParam && this.currentPuzzle && normalizePuzzleId(this.currentPuzzle.numericId)) {
      params.p = normalizePuzzleId(this.currentPuzzle.numericId);
      hasSeedUrl = true;
    }
    route = buildCleanAbsoluteUrl(this.getRoutePath(this.currentDifficulty), params);
    if (canonical) {
      canonical.setAttribute("href", route);
    }
    if (ogUrl) {
      ogUrl.setAttribute("content", route);
    }
    if (!robots && document.head) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    if (robots) {
      robots.setAttribute("content", hasSeedUrl ? "noindex, follow" : "index, follow");
    }
  };

  SudokuApp.prototype.bindEvents = function () {
    var self = this;

    this.root.addEventListener("click", function (event) {
      var difficultyTarget = event.target.closest("[data-select-difficulty]");
      var actionTarget = event.target.closest("[data-action]");
      var mobileActionTarget = event.target.closest("[data-mobile-action]");
      var numberTarget = event.target.closest("[data-number]");
      var cellTarget = event.target.closest("[data-index]");

      if (difficultyTarget) {
        self.changeDifficulty(difficultyTarget.getAttribute("data-select-difficulty"));
        return;
      }

      if (actionTarget) {
        self.handleAction(actionTarget.getAttribute("data-action"));
      }

      if (mobileActionTarget) {
        self.handleAction(mobileActionTarget.getAttribute("data-mobile-action"));
      }

      if (numberTarget) {
        self.placeValue(Number(numberTarget.getAttribute("data-number")));
      }

      if (cellTarget && cellTarget.parentNode === self.boardEl) {
        self.selectCell(Number(cellTarget.getAttribute("data-index")), true);
      }
    });

    this.root.addEventListener("keydown", function (event) {
      var active = document.activeElement;
      var move = 0;
      if (!self.root.contains(active)) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        self.undo();
        return;
      }

      if (event.key >= "1" && event.key <= "9") {
        event.preventDefault();
        self.placeValue(Number(event.key));
        return;
      }

      if (event.code.indexOf("Numpad") === 0) {
        var numpadValue = Number(event.code.replace("Numpad", ""));
        if (numpadValue >= 1 && numpadValue <= 9) {
          event.preventDefault();
          self.placeValue(numpadValue);
          return;
        }
      }

      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        event.preventDefault();
        self.erase();
        return;
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        self.toggleNotesMode();
        return;
      }

      if (event.key.toLowerCase() === "h") {
        event.preventDefault();
        self.useHint();
        return;
      }

      if (event.key === "ArrowUp") {
        move = -9;
      } else if (event.key === "ArrowDown") {
        move = 9;
      } else if (event.key === "ArrowLeft") {
        move = -1;
      } else if (event.key === "ArrowRight") {
        move = 1;
      }

      if (move !== 0) {
        event.preventDefault();
        self.moveSelection(move);
      }
    });

    if (this.modal) {
      this.modal.addEventListener("click", function (event) {
        var actionTarget = event.target.closest("[data-action]");
        if (actionTarget) {
          self.handleAction(actionTarget.getAttribute("data-action"));
          return;
        }
        if (event.target === self.modal) {
          self.closeModal();
        }
      });
    }
  };

  SudokuApp.prototype.buildBoard = function () {
    var fragment = document.createDocumentFragment();
    var index;
    var row;
    var col;
    var button;
    for (index = 0; index < 81; index += 1) {
      row = Math.floor(index / 9);
      col = index % 9;
      button = document.createElement("button");
      button.type = "button";
      button.className = "cell";
      if (col === 2 || col === 5) {
        button.classList.add("cell--col-divider");
      }
      if (row === 2 || row === 5) {
        button.classList.add("cell--row-divider");
      }
      button.setAttribute("data-index", String(index));
      fragment.appendChild(button);
      this.cellButtons.push(button);
    }
    if (this.boardEl) {
      this.boardEl.appendChild(fragment);
    }
  };

  SudokuApp.prototype.startTimer = function () {
    var self = this;
    window.clearInterval(this.intervalId);
    this.intervalId = window.setInterval(function () {
      self.elapsed += 1;
      if (self.timerEl) {
        self.timerEl.textContent = formatTime(self.elapsed);
      }
      if (self.mobileTimerEl) {
        self.mobileTimerEl.textContent = formatTime(self.elapsed);
      }
      self.updateBestTimeUi();
    }, 1000);
  };

  SudokuApp.prototype.stopTimer = function () {
    window.clearInterval(this.intervalId);
    this.intervalId = null;
  };

  SudokuApp.prototype.getDifficultyLabel = function (difficulty) {
    return getDifficultyMeta(difficulty || this.currentDifficulty).label;
  };

  SudokuApp.prototype.getDifficultyBank = function () {
    return this.catalog[this.currentDifficulty] || [];
  };

  SudokuApp.prototype.pickRandomPuzzle = function () {
    var bank = this.getDifficultyBank();
    var currentId = this.currentPuzzle ? this.currentPuzzle.numericId : null;
    var lastId = this.lastPuzzleIdByDifficulty[this.currentDifficulty];
    var nextId;

    if (!bank.length) {
      return null;
    }

    nextId = getRandomPuzzleIdForDifficulty(currentId, lastId);
    this.lastPuzzleIdByDifficulty[this.currentDifficulty] = nextId;
    return buildPuzzleFromId(nextId, this.currentDifficulty);
  };

  SudokuApp.prototype.pickNextPuzzle = function () {
    var bank = this.getDifficultyBank();
    var nextId;
    if (!bank.length) {
      return null;
    }
    if (!this.currentPuzzle || this.currentPuzzle.difficulty !== this.currentDifficulty) {
      nextId = String(MIN_PUZZLE_ID);
      this.lastPuzzleIdByDifficulty[this.currentDifficulty] = nextId;
      return buildPuzzleFromId(nextId, this.currentDifficulty);
    }
    nextId = getNextPuzzleIdForDifficulty(this.currentPuzzle.numericId);
    this.lastPuzzleIdByDifficulty[this.currentDifficulty] = nextId;
    return buildPuzzleFromId(nextId, this.currentDifficulty);
  };

  SudokuApp.prototype.createCells = function (puzzle) {
    return puzzle.puzzle.split("").map(function (char, index) {
      return {
        value: Number(char),
        solution: Number(puzzle.solution.charAt(index)),
        given: char !== "0",
        notes: []
      };
    });
  };

  SudokuApp.prototype.startNewGame = function (forcedPuzzle, options) {
    var includePuzzleParam;
    var puzzle;
    options = options || {};

    if (forcedPuzzle) {
      this.currentDifficulty = forcedPuzzle.difficulty;
      puzzle = forcedPuzzle;
    } else {
      puzzle = this.pickRandomPuzzle();
    }

    if (!puzzle) {
      this.setStatus("No puzzle data is available for this level.");
      return;
    }

    this.closeModal();
    this.currentPuzzle = puzzle;
    this.lastPuzzleIdByDifficulty[this.currentDifficulty] = puzzle.numericId;
    this.cells = this.createCells(puzzle);
    this.history = [];
    this.notesMode = false;
    this.solved = false;
    this.elapsed = 0;
    this.clearTransientError();
    if (this.timerEl) {
      this.timerEl.textContent = "00:00";
    }
    if (this.mobileTimerEl) {
      this.mobileTimerEl.textContent = "00:00";
    }
    this.selectedIndex = this.findFirstEditableCell();
    this.updateNotesButton();
    this.startTimer();
    this.updateDifficultyUi();
    this.updatePuzzleMetaUi();
    includePuzzleParam = typeof options.includePuzzleParam === "boolean"
      ? options.includePuzzleParam
      : this.hasExplicitPuzzleParam;
    if (this.isDaily) {
      includePuzzleParam = false;
    }
    this.hasExplicitPuzzleParam = includePuzzleParam;
    this.syncPageLocation(includePuzzleParam);
    this.syncCanonicalUrl();
    this.setStatus(this.isDaily ? "Today's daily Sudoku is ready. Select a cell to start." : this.getDifficultyLabel() + " Sudoku is ready. Select a cell to start.");
    this.render();
    this.focusSelectedCell();
  };

  SudokuApp.prototype.changeDifficulty = function (difficulty) {
    var nextPuzzle;
    if (this.isDaily) {
      return;
    }
    if (!DIFFICULTY_META[difficulty] || difficulty === this.currentDifficulty) {
      return;
    }
    this.currentDifficulty = difficulty;
    this.preferences.lastDifficulty = difficulty;
    savePreferences(this.preferences);
    this.closeModal();
    nextPuzzle = this.currentPuzzle && this.currentPuzzle.numericId
      ? buildPuzzleFromId(this.currentPuzzle.numericId, difficulty)
      : null;
    this.currentPuzzle = null;
    this.startNewGame(nextPuzzle, {
      includePuzzleParam: this.hasExplicitPuzzleParam
    });
  };

  SudokuApp.prototype.updateDifficultyUi = function () {
    var difficultyMeta = getDifficultyMeta(this.currentDifficulty);
    if (this.currentLevelEl) {
      this.currentLevelEl.textContent = difficultyMeta.label;
    }
    if (this.mobileCurrentLevelEl) {
      this.mobileCurrentLevelEl.textContent = difficultyMeta.label;
    }
    if (this.gameTitleEl) {
      this.gameTitleEl.textContent = this.isDaily ? "Daily Sudoku" : difficultyMeta.label + " Sudoku";
    }
    if (this.gameIntroEl) {
      this.gameIntroEl.textContent = this.isDaily ? "A new daily Sudoku appears every day." : difficultyMeta.intro;
    }
    if (this.boardEl) {
      this.boardEl.setAttribute("aria-label", this.isDaily ? "Daily Sudoku board" : difficultyMeta.label + " Sudoku board");
    }
    if (this.newGameButton) {
      this.newGameButton.setAttribute("aria-label", "Start a new " + difficultyMeta.label.toLowerCase() + " Sudoku puzzle");
    }
    this.difficultyButtons.forEach(function (button) {
      var isCurrent = button.getAttribute("data-select-difficulty") === this.currentDifficulty;
      button.classList.toggle("is-current", isCurrent);
      button.setAttribute("aria-pressed", isCurrent ? "true" : "false");
    }, this);
    this.updateMobileSummary();
    this.updateBestTimeUi();
  };

  SudokuApp.prototype.applyPreferenceUi = function () {
    applyTheme(this.preferences.theme);
    if (this.timerWrap) {
      this.timerWrap.classList.toggle("is-hidden", !this.preferences.speedMode);
      this.timerWrap.classList.toggle("timer--active", this.preferences.speedMode);
    }
    if (this.mobileTimerCard) {
      this.mobileTimerCard.hidden = !this.preferences.speedMode;
      this.mobileTimerCard.classList.toggle("timer--active", this.preferences.speedMode);
    }
    this.updateSettingToggle(this.noMistakesToggle, this.preferences.noMistakes, "No mistakes");
    this.updateSettingToggle(this.mobileNoMistakesToggle, this.preferences.noMistakes, "No mistakes");
    this.updateSettingToggle(this.speedModeToggle, this.preferences.speedMode, "Speed mode");
    this.updateSettingToggle(this.mobileSpeedModeToggle, this.preferences.speedMode, "Speed mode");
    this.updateModeSummary();
    this.updateBestTimeUi();
  };

  SudokuApp.prototype.updateSettingToggle = function (button, isActive, label) {
    if (!button) {
      return;
    }
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.textContent = label + (isActive ? ": On" : ": Off");
  };

  SudokuApp.prototype.updatePuzzleMetaUi = function () {
    var shareLabel = this.currentPuzzle ? this.currentPuzzle.numericId : "--";
    if (this.puzzleIdValue) {
      this.puzzleIdValue.textContent = shareLabel;
    }
    if (this.mobilePuzzleIdValue) {
      this.mobilePuzzleIdValue.textContent = shareLabel;
    }
    if (this.modalPuzzleId) {
      this.modalPuzzleId.textContent = shareLabel;
    }
    this.resetCopyButtons();
    this.updateMobileSummary();
    this.updateBestTimeUi();
  };

  SudokuApp.prototype.updateModeSummary = function () {
    if (!this.modeSummaryEl && !this.mobileModeSummaryEl) {
      return;
    }
    if (this.modeSummaryEl) {
      this.modeSummaryEl.textContent = "No mistakes: " + (this.preferences.noMistakes ? "On" : "Off") +
        " · Speed mode: " + (this.preferences.speedMode ? "On" : "Off");
    }
    if (this.mobileModeSummaryEl) {
      this.mobileModeSummaryEl.textContent = "No mistakes: " + (this.preferences.noMistakes ? "On" : "Off") +
        " · Speed mode: " + (this.preferences.speedMode ? "On" : "Off");
    }
  };

  SudokuApp.prototype.updateBestTimeUi = function () {
    var bestTime = this.bestTimes[this.currentDifficulty];
    if (this.bestTimeCard) {
      this.bestTimeCard.hidden = !this.preferences.speedMode || !bestTime;
    }
    if (this.bestTimeValue) {
      this.bestTimeValue.textContent = bestTime ? formatTime(bestTime) : "--:--";
    }
    if (this.mobileBestTimeCard) {
      this.mobileBestTimeCard.hidden = !this.preferences.speedMode || !bestTime;
    }
    if (this.mobileBestTimeValue) {
      this.mobileBestTimeValue.textContent = bestTime ? formatTime(bestTime) : "--:--";
    }
  };

  SudokuApp.prototype.updateMobileSummary = function () {
    if (!this.mobileSummaryEl) {
      return;
    }
    this.mobileSummaryEl.textContent = this.getDifficultyLabel() + " · #" + (this.currentPuzzle ? this.currentPuzzle.numericId : "--");
  };

  SudokuApp.prototype.findFirstEditableCell = function () {
    var index;
    for (index = 0; index < this.cells.length; index += 1) {
      if (!this.cells[index].given) {
        return index;
      }
    }
    return 0;
  };

  SudokuApp.prototype.cloneState = function (cell) {
    return {
      value: cell.value,
      notes: cell.notes.slice()
    };
  };

  SudokuApp.prototype.pushHistory = function (index, previous, next) {
    this.history.push({
      index: index,
      previous: previous,
      next: next
    });
  };

  SudokuApp.prototype.setStatus = function (message) {
    if (this.statusEl) {
      this.statusEl.textContent = message;
    }
    if (this.mobileStatusEl) {
      this.mobileStatusEl.textContent = message;
    }
    if (this.liveRegion) {
      this.liveRegion.textContent = message;
    }
    this.updateModeSummary();
  };

  SudokuApp.prototype.selectCell = function (index, focusCell) {
    this.selectedIndex = index;
    this.render();
    if (focusCell) {
      this.focusSelectedCell();
    }
  };

  SudokuApp.prototype.focusSelectedCell = function () {
    var button = this.cellButtons[this.selectedIndex];
    if (button) {
      button.focus();
    }
  };

  SudokuApp.prototype.moveSelection = function (step) {
    var row = Math.floor(this.selectedIndex / 9);
    var col = this.selectedIndex % 9;
    if (step === -1 && col === 0) {
      return;
    }
    if (step === 1 && col === 8) {
      return;
    }
    if (step === -9 && row === 0) {
      return;
    }
    if (step === 9 && row === 8) {
      return;
    }
    this.selectCell(this.selectedIndex + step, true);
  };

  SudokuApp.prototype.handleAction = function (action) {
    if (action === "undo") {
      this.undo();
      return;
    }
    if (action === "erase") {
      this.erase();
      return;
    }
    if (action === "notes") {
      this.toggleNotesMode();
      return;
    }
    if (action === "hint") {
      this.useHint();
      return;
    }
    if (action === "new-game") {
      this.startNewGame(null, { includePuzzleParam: true });
      return;
    }
    if (action === "next-puzzle") {
      this.loadNextPuzzle();
      return;
    }
    if (action === "copy-link") {
      this.copyLink();
      return;
    }
    if (action === "print-puzzle") {
      this.printPuzzle();
      return;
    }
    if (action === "toggle-no-mistakes") {
      this.preferences.noMistakes = !this.preferences.noMistakes;
      savePreferences(this.preferences);
      this.applyPreferenceUi();
      this.setStatus(this.preferences.noMistakes ? "No mistakes mode is on." : "No mistakes mode is off.");
      this.render();
      return;
    }
    if (action === "toggle-speed") {
      this.preferences.speedMode = !this.preferences.speedMode;
      savePreferences(this.preferences);
      this.applyPreferenceUi();
      this.setStatus(this.preferences.speedMode ? "Speed mode is on." : "Speed mode is off.");
      return;
    }
    if (action === "toggle-theme") {
      this.preferences.theme = this.preferences.theme === "dark" ? "light" : "dark";
      savePreferences(this.preferences);
      this.applyPreferenceUi();
      this.setStatus(this.preferences.theme === "dark" ? "Dark theme enabled." : "Light theme enabled.");
      return;
    }
    if (action === "close-modal") {
      this.closeModal();
    }
  };

  SudokuApp.prototype.toggleNotesMode = function () {
    this.notesMode = !this.notesMode;
    this.updateNotesButton();
    this.setStatus(this.notesMode ? "Notes mode is on." : "Notes mode is off.");
  };

  SudokuApp.prototype.updateNotesButton = function () {
    if (!this.notesButton) {
      if (!this.mobileNotesButton) {
        return;
      }
    }
    if (this.notesButton) {
      this.notesButton.classList.toggle("is-active", this.notesMode);
      this.notesButton.setAttribute("aria-pressed", this.notesMode ? "true" : "false");
    }
    if (this.mobileNotesButton) {
      this.mobileNotesButton.classList.toggle("is-active", this.notesMode);
      this.mobileNotesButton.setAttribute("aria-pressed", this.notesMode ? "true" : "false");
    }
  };

  SudokuApp.prototype.loadNextPuzzle = function () {
    var puzzle = this.pickNextPuzzle();
    if (!puzzle) {
      this.setStatus("No more puzzles are available for this level.");
      return;
    }
    this.startNewGame(puzzle, { forcePuzzle: true, includePuzzleParam: true });
  };

  SudokuApp.prototype.triggerTransientError = function (index) {
    var self = this;
    this.transientErrorIndex = index;
    window.clearTimeout(this.transientErrorTimer);
    this.transientErrorTimer = window.setTimeout(function () {
      self.clearTransientError();
    }, 420);
    this.render();
  };

  SudokuApp.prototype.clearTransientError = function () {
    this.transientErrorIndex = null;
    window.clearTimeout(this.transientErrorTimer);
    this.transientErrorTimer = null;
  };

  SudokuApp.prototype.placeValue = function (value) {
    var cell;
    var previous;
    var notes;
    var noteIndex;
    if (this.solved) {
      return;
    }

    cell = this.cells[this.selectedIndex];
    if (!cell || cell.given) {
      this.setStatus("This cell is fixed. Choose an empty editable cell.");
      return;
    }

    previous = this.cloneState(cell);
    if (this.notesMode) {
      if (cell.value) {
        this.setStatus("Clear the cell before adding notes.");
        return;
      }
      notes = cell.notes.slice();
      noteIndex = notes.indexOf(value);
      if (noteIndex === -1) {
        notes.push(value);
        notes.sort(function (left, right) {
          return left - right;
        });
      } else {
        notes.splice(noteIndex, 1);
      }
      cell.notes = notes;
      this.pushHistory(this.selectedIndex, previous, this.cloneState(cell));
      this.setStatus("Notes updated for row " + (Math.floor(this.selectedIndex / 9) + 1) + ".");
    } else {
      if (this.preferences.noMistakes && value !== cell.solution) {
        this.triggerTransientError(this.selectedIndex);
        this.setStatus("That number does not fit here.");
        return;
      }
      cell.value = cell.value === value ? 0 : value;
      cell.notes = [];
      this.pushHistory(this.selectedIndex, previous, this.cloneState(cell));
      if (cell.value) {
        this.setStatus("Placed " + value + ".");
      } else {
        this.setStatus("Cell cleared.");
      }
    }

    this.render();
    this.checkSolved();
  };

  SudokuApp.prototype.erase = function () {
    var cell;
    var previous;
    if (this.solved) {
      return;
    }
    cell = this.cells[this.selectedIndex];
    if (!cell || cell.given) {
      this.setStatus("This cell cannot be erased.");
      return;
    }
    if (!cell.value && !cell.notes.length) {
      this.setStatus("This cell is already empty.");
      return;
    }
    previous = this.cloneState(cell);
    cell.value = 0;
    cell.notes = [];
    this.pushHistory(this.selectedIndex, previous, this.cloneState(cell));
    this.setStatus("Cell erased.");
    this.render();
  };

  SudokuApp.prototype.undo = function () {
    var last;
    var cell;
    if (!this.history.length) {
      this.setStatus("Nothing to undo yet.");
      return;
    }
    last = this.history.pop();
    cell = this.cells[last.index];
    cell.value = last.previous.value;
    cell.notes = last.previous.notes.slice();
    this.selectedIndex = last.index;
    this.setStatus("Last move undone.");
    this.render();
    this.focusSelectedCell();
  };

  SudokuApp.prototype.useHint = function () {
    var index;
    var cell;
    var previous;
    if (this.solved) {
      return;
    }
    index = this.selectedIndex;
    cell = this.cells[index];

    if (!cell || cell.given || cell.value === cell.solution) {
      index = this.findHintCandidate();
      cell = this.cells[index];
      this.selectedIndex = index;
    }

    if (!cell || cell.given) {
      this.setStatus("No hint is available for this puzzle.");
      return;
    }

    previous = this.cloneState(cell);
    cell.value = cell.solution;
    cell.notes = [];
    this.pushHistory(index, previous, this.cloneState(cell));
    this.setStatus("Hint added to row " + (Math.floor(index / 9) + 1) + ", column " + ((index % 9) + 1) + ".");
    this.render();
    this.focusSelectedCell();
    this.checkSolved();
  };

  SudokuApp.prototype.findHintCandidate = function () {
    var index;
    for (index = 0; index < this.cells.length; index += 1) {
      if (!this.cells[index].given && this.cells[index].value !== this.cells[index].solution) {
        return index;
      }
    }
    return this.selectedIndex;
  };

  SudokuApp.prototype.collectConflicts = function () {
    var conflicts = new Set();
    var groups = [];
    var row;
    var col;
    var boxRow;
    var boxCol;

    for (row = 0; row < 9; row += 1) {
      groups.push([]);
      for (col = 0; col < 9; col += 1) {
        groups[groups.length - 1].push(row * 9 + col);
      }
    }

    for (col = 0; col < 9; col += 1) {
      groups.push([]);
      for (row = 0; row < 9; row += 1) {
        groups[groups.length - 1].push(row * 9 + col);
      }
    }

    for (boxRow = 0; boxRow < 3; boxRow += 1) {
      for (boxCol = 0; boxCol < 3; boxCol += 1) {
        groups.push([]);
        for (row = boxRow * 3; row < boxRow * 3 + 3; row += 1) {
          for (col = boxCol * 3; col < boxCol * 3 + 3; col += 1) {
            groups[groups.length - 1].push(row * 9 + col);
          }
        }
      }
    }

    groups.forEach(function (group) {
      var seen = {};
      group.forEach(function (cellIndex) {
        var value = this.cells[cellIndex].value;
        if (!value) {
          return;
        }
        if (!seen[value]) {
          seen[value] = [];
        }
        seen[value].push(cellIndex);
      }, this);

      Object.keys(seen).forEach(function (value) {
        if (seen[value].length > 1) {
          seen[value].forEach(function (duplicateIndex) {
            conflicts.add(duplicateIndex);
          });
        }
      });
    }, this);

    return conflicts;
  };

  SudokuApp.prototype.isLinePeer = function (index) {
    var selectedRow;
    var selectedCol;
    var row;
    var col;
    if (index === this.selectedIndex) {
      return false;
    }
    selectedRow = Math.floor(this.selectedIndex / 9);
    selectedCol = this.selectedIndex % 9;
    row = Math.floor(index / 9);
    col = index % 9;
    return row === selectedRow || col === selectedCol;
  };

  SudokuApp.prototype.isBlockPeer = function (index) {
    var selectedRow;
    var selectedCol;
    var row;
    var col;
    if (index === this.selectedIndex) {
      return false;
    }
    selectedRow = Math.floor(this.selectedIndex / 9);
    selectedCol = this.selectedIndex % 9;
    row = Math.floor(index / 9);
    col = index % 9;
    return Math.floor(row / 3) === Math.floor(selectedRow / 3) && Math.floor(col / 3) === Math.floor(selectedCol / 3);
  };

  SudokuApp.prototype.render = function () {
    var conflicts = this.collectConflicts();
    var selectedCell = this.cells[this.selectedIndex];
    var matchValue = selectedCell && selectedCell.value ? selectedCell.value : 0;
    var self = this;

    this.cells.forEach(function (cell, index) {
      var button = self.cellButtons[index];
      var className = "cell";
      var row = Math.floor(index / 9);
      var col = index % 9;
      var isMistake = !cell.given && cell.value && cell.value !== cell.solution;

      if (col === 2 || col === 5) {
        className += " cell--col-divider";
      }
      if (row === 2 || row === 5) {
        className += " cell--row-divider";
      }
      className += cell.given ? " cell--given" : " cell--editable";
      if (index === self.selectedIndex) {
        className += " cell--selected";
      }
      if (self.isLinePeer(index)) {
        className += " cell--line-peer";
      }
      if (self.isBlockPeer(index)) {
        className += " cell--focus-block";
      }
      if (matchValue && cell.value === matchValue) {
        className += " cell--matching";
      }
      if (conflicts.has(index)) {
        className += " cell--conflict";
      }
      if (isMistake) {
        className += " cell--mistake";
      }
      if (self.transientErrorIndex === index) {
        className += " cell--rejected";
      }

      button.className = className;
      button.innerHTML = cell.value
        ? "<span class=\"cell__value\">" + cell.value + "</span>"
        : createNotesMarkup(cell.notes);
      button.setAttribute("aria-label", getCellLabel(index, cell));
      button.setAttribute("aria-selected", index === self.selectedIndex ? "true" : "false");
      button.setAttribute("tabindex", index === self.selectedIndex ? "0" : "-1");
      button.disabled = false;
    });
  };

  SudokuApp.prototype.updateBestTime = function () {
    var currentBest;
    if (!this.preferences.speedMode) {
      return null;
    }
    currentBest = this.bestTimes[this.currentDifficulty];
    if (!currentBest || this.elapsed < currentBest) {
      this.bestTimes[this.currentDifficulty] = this.elapsed;
      saveBestTimes(this.bestTimes);
      return this.elapsed;
    }
    return currentBest;
  };

  SudokuApp.prototype.checkSolved = function () {
    var conflicts = this.collectConflicts();
    var index;
    if (conflicts.size > 0) {
      return;
    }
    for (index = 0; index < this.cells.length; index += 1) {
      if (this.cells[index].value !== this.cells[index].solution) {
        return;
      }
    }
    this.solved = true;
    this.stopTimer();
    this.openModal();
  };

  SudokuApp.prototype.openModal = function () {
    var bestTime = this.updateBestTime();
    var solvedMessage = this.currentPuzzle ? getSolvedMessage(this.currentPuzzle.numericId) : SOLVED_MESSAGES[0];
    this.refreshModalRefs();
    if (this.modalPuzzleId && this.currentPuzzle) {
      this.modalPuzzleId.textContent = this.currentPuzzle.numericId;
    }
    if (this.modalDifficulty) {
      this.modalDifficulty.textContent = this.getDifficultyLabel();
    }
    if (this.modalTimeRow) {
      this.modalTimeRow.hidden = false;
    }
    if (this.modalBestRow) {
      this.modalBestRow.hidden = !this.preferences.speedMode || !bestTime;
    }
    if (this.modalTime) {
      this.modalTime.textContent = formatTime(this.elapsed);
    }
    if (this.modalBestTime && bestTime) {
      this.modalBestTime.textContent = formatTime(bestTime);
    }
    if (this.modalCopyLink) {
      this.modalCopyLink.setAttribute("aria-label", "Share puzzle " + (this.currentPuzzle ? this.currentPuzzle.numericId : ""));
      this.modalCopyLink.setAttribute("title", "Share this puzzle");
    }
    if (this.modalPraise) {
      this.modalPraise.textContent = solvedMessage;
    }
    this.updateBestTimeUi();
    if (this.modal) {
      this.modal.classList.remove("modal--celebrate");
      this.modal.classList.add("is-open");
      void this.modal.offsetWidth;
      this.modal.classList.add("modal--celebrate");
    }
    if (this.preferences.speedMode) {
      this.setStatus("Solved in " + formatTime(this.elapsed) + ".");
    } else {
      this.setStatus("Puzzle solved.");
    }
  };

  SudokuApp.prototype.closeModal = function () {
    if (this.modal) {
      this.modal.classList.remove("is-open");
    }
  };

  SudokuApp.prototype.resetCopyButtons = function () {
    if (this.copyResetTimer) {
      window.clearTimeout(this.copyResetTimer);
      this.copyResetTimer = null;
    }
    if (this.copyLinkButton) {
      setButtonLabel(this.copyLinkButton, "share", "Share", {
        ariaLabel: "Share this puzzle",
        title: "Share this puzzle"
      });
    }
    if (this.mobileCopyLinkButton) {
      setButtonLabel(this.mobileCopyLinkButton, "share", "Share", {
        ariaLabel: "Share this puzzle",
        title: "Share this puzzle",
        iconOnlyOnMobile: true
      });
    }
    if (this.modalCopyLink) {
      setButtonLabel(this.modalCopyLink, "share", "Share", {
        ariaLabel: "Share this puzzle",
        title: "Share this puzzle"
      });
    }
  };

  SudokuApp.prototype.copyLink = function () {
    var cleanUrl;
    var self = this;
    this.resetCopyButtons();
    if (!this.isDaily && this.currentPuzzle && this.currentPuzzle.numericId) {
      this.hasExplicitPuzzleParam = true;
      this.syncPageLocation(true);
    }
    cleanUrl = buildCleanAbsoluteUrl(
      this.getRoutePath(this.currentDifficulty),
      !this.isDaily && this.currentPuzzle ? { p: this.currentPuzzle.numericId } : {},
      ""
    );
    copyText(cleanUrl).then(function () {
      if (self.copyLinkButton) {
        setButtonLabel(self.copyLinkButton, "share", "Copied", {
          ariaLabel: "Puzzle link copied",
          title: "Puzzle link copied"
        });
      }
      if (self.mobileCopyLinkButton) {
        setButtonLabel(self.mobileCopyLinkButton, "share", "Copied", {
          ariaLabel: "Puzzle link copied",
          title: "Puzzle link copied",
          iconOnlyOnMobile: true
        });
      }
      if (self.modalCopyLink) {
        setButtonLabel(self.modalCopyLink, "share", "Copied", {
          ariaLabel: "Puzzle link copied",
          title: "Puzzle link copied"
        });
      }
      self.copyResetTimer = window.setTimeout(function () {
        self.resetCopyButtons();
      }, 1400);
      self.setStatus("Puzzle link copied.");
    }).catch(function () {
      self.setStatus("Unable to copy the link on this browser.");
    });
  };

  SudokuApp.prototype.getPrintShareUrl = function () {
    var routePath;
    if (!this.currentPuzzle || !this.currentPuzzle.numericId) {
      return buildCleanAbsoluteUrl(this.getRoutePath(this.currentDifficulty), {}, "");
    }
    if (this.isDaily) {
      routePath = getRouteForDifficulty(this.currentDifficulty, false);
    } else {
      routePath = this.getRoutePath(this.currentDifficulty);
    }
    return buildCleanAbsoluteUrl(routePath, { p: this.currentPuzzle.numericId }, "");
  };

  SudokuApp.prototype.getPrintablePuzzleTitle = function () {
    if (this.isDaily) {
      return "Daily Sudoku";
    }
    return this.getDifficultyLabel() + " Sudoku";
  };

  SudokuApp.prototype.buildPrintGridMarkup = function () {
    var puzzle = this.currentPuzzle ? this.currentPuzzle.puzzle : "";
    var cells = [];
    var index;
    var row;
    var column;
    var value;
    var classes;
    for (index = 0; index < puzzle.length; index += 1) {
      row = Math.floor(index / 9);
      column = index % 9;
      value = puzzle.charAt(index);
      classes = ["print-grid__cell"];
      if ((column + 1) % 3 === 0 && column !== 8) {
        classes.push("print-grid__cell--divider-right");
      }
      if ((row + 1) % 3 === 0 && row !== 8) {
        classes.push("print-grid__cell--divider-bottom");
      }
      if (value === "0") {
        classes.push("print-grid__cell--empty");
      }
      cells.push("<div class=\"" + classes.join(" ") + "\">" + (value === "0" ? "" : escapeHtml(value)) + "</div>");
    }
    return cells.join("");
  };

  SudokuApp.prototype.buildPrintDocument = function (qrMarkup) {
    var puzzleId = this.currentPuzzle ? this.currentPuzzle.numericId : "--";
    var difficulty = this.getDifficultyLabel();
    var shareUrl = this.getPrintShareUrl();
    var title = this.getPrintablePuzzleTitle();
    return "<!doctype html>" +
      "<html lang=\"en\">" +
      "<head>" +
        "<meta charset=\"utf-8\">" +
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
        "<title>" + escapeHtml(title) + " - Puzzle #" + escapeHtml(puzzleId) + "</title>" +
        "<style>" +
          "@page{size:A4 portrait;margin:14mm;}" +
          "html,body{margin:0;padding:0;background:#fff;color:#111;font-family:\"SF Pro Text\",\"Segoe UI\",Arial,sans-serif;}" +
          "body{min-height:100vh;}" +
          ".print-page{position:relative;min-height:100vh;display:flex;justify-content:center;}" +
          ".print-page::before{content:\"Sudoku-Play.org — Free Online Sudoku\";position:fixed;left:50%;top:42%;transform:translate(-50%,-50%) rotate(-16deg);font-size:34px;font-weight:700;letter-spacing:.04em;color:rgba(40,40,40,.04);pointer-events:none;white-space:nowrap;}" +
          ".print-sheet{position:relative;width:180mm;display:grid;gap:5.5mm;justify-items:center;}" +
          ".print-header{width:100%;display:grid;gap:1.8mm;text-align:center;}" +
          ".print-header__brand{font-size:17px;font-weight:700;letter-spacing:-.02em;}" +
          ".print-header__title{font-size:27px;font-weight:700;letter-spacing:-.03em;}" +
          ".print-meta{display:flex;justify-content:center;gap:4.5mm;flex-wrap:wrap;font-size:12.5px;color:#333;}" +
          ".print-grid{display:grid;grid-template-columns:repeat(9,1fr);width:132mm;aspect-ratio:1;border:2.4px solid #1d1d1d;background:#fff;}" +
          ".print-grid__cell{display:flex;align-items:center;justify-content:center;border-right:1px solid #7c7c7c;border-bottom:1px solid #7c7c7c;font-size:7.4mm;font-weight:700;color:#111;}" +
          ".print-grid__cell--empty{color:transparent;}" +
          ".print-grid__cell--divider-right{border-right:2px solid #1d1d1d;}" +
          ".print-grid__cell--divider-bottom{border-bottom:2px solid #1d1d1d;}" +
          ".print-grid__cell:nth-child(9n){border-right:0;}" +
          ".print-grid__cell:nth-last-child(-n+9){border-bottom:0;}" +
          ".print-footer{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7mm;align-items:end;margin-top:1mm;padding-top:3.5mm;border-top:1px solid #e4e4e4;}" +
          ".print-branding{display:grid;gap:1.6mm;font-size:12px;color:#2b2b2b;}" +
          ".print-branding__line{font-weight:700;color:#111;}" +
          ".print-branding__small{font-size:10.5px;color:#666;}" +
          ".print-qr{display:grid;justify-items:center;gap:1.8mm;padding:3.4mm;border:1px solid #d5d5d5;border-radius:2.6mm;background:#fff;}" +
          ".print-qr img,.print-qr svg{display:block;width:30mm;height:30mm;background:#fff;}" +
          ".print-qr__fallback{width:36mm;min-height:30mm;display:grid;place-items:center;text-align:center;font-size:8.2px;line-height:1.35;color:#444;word-break:break-word;}" +
          ".print-qr__caption{font-size:9.6px;text-align:center;color:#444;line-height:1.3;max-width:36mm;}" +
        "</style>" +
      "</head>" +
      "<body>" +
        "<div class=\"print-page\">" +
          "<main class=\"print-sheet\">" +
            "<header class=\"print-header\">" +
              "<div class=\"print-header__brand\">Sudoku-Play.org</div>" +
              "<div class=\"print-header__title\">" + escapeHtml(title) + "</div>" +
              "<div class=\"print-meta\">" +
                "<span>Difficulty: " + escapeHtml(difficulty) + "</span>" +
                "<span>Puzzle ID: " + escapeHtml(puzzleId) + "</span>" +
              "</div>" +
            "</header>" +
            "<section class=\"print-grid\" aria-label=\"Printable Sudoku puzzle\">" +
              this.buildPrintGridMarkup() +
            "</section>" +
            "<footer class=\"print-footer\">" +
              "<div class=\"print-branding\">" +
                "<div class=\"print-branding__line\">Sudoku-Play.org — Puzzle #" + escapeHtml(puzzleId) + "</div>" +
                "<div>Print puzzle only. No solution included.</div>" +
                "<div class=\"print-branding__small\">Scan the QR code to open this same puzzle online.</div>" +
              "</div>" +
              "<aside class=\"print-qr\" aria-label=\"Puzzle QR code\">" +
                (qrMarkup || "") +
                "<div class=\"print-qr__caption\">Scan to play this puzzle online</div>" +
              "</aside>" +
            "</footer>" +
          "</main>" +
        "</div>" +
      "</body>" +
      "</html>";
  };

  SudokuApp.prototype.printPuzzle = function () {
    var iframe;
    var iframeDoc;
    var iframeWindow;
    var self = this;
    var printed = false;
    var cleanup = function () {
      window.setTimeout(function () {
        iframe.remove();
      }, 80);
    };
    var goToPrint = function () {
      if (printed || !iframeWindow) {
        return;
      }
      printed = true;
      iframeWindow.focus();
      window.setTimeout(function () {
        try {
          iframeWindow.print();
        } catch (error) {
          cleanup();
        }
      }, 120);
    };
    if (!this.currentPuzzle) {
      this.setStatus("Puzzle is not ready to print yet.");
      return;
    }
    loadQrLibrary().then(function () {
      var qrMarkup = buildPrintQrMarkup(self.getPrintShareUrl(), 144, self.currentPuzzle.numericId);
      iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      document.body.appendChild(iframe);
      iframeDoc = iframe.contentWindow ? iframe.contentWindow.document : iframe.contentDocument;
      if (!iframeDoc) {
        iframe.remove();
        self.setStatus("Unable to open the print view on this browser.");
        return;
      }
      iframeDoc.open();
      iframeDoc.write(self.buildPrintDocument(qrMarkup));
      iframeDoc.close();
      iframeWindow = iframe.contentWindow;
      if (iframeWindow) {
        iframeWindow.addEventListener("afterprint", cleanup, { once: true });
      }
      window.setTimeout(cleanup, 60000);
      window.setTimeout(function () {
        var qrImage = iframeDoc.querySelector("[data-print-qr]");
        if (qrImage && !qrImage.complete) {
          qrImage.addEventListener("load", goToPrint, { once: true });
          qrImage.addEventListener("error", goToPrint, { once: true });
          window.setTimeout(goToPrint, 1800);
        } else {
          goToPrint();
        }
      }, 0);
      self.setStatus("Opening print dialog for puzzle " + self.currentPuzzle.numericId + ".");
    }).catch(function () {
      self.setStatus("Unable to build the QR code for printing.");
    });
  };

  if (document.body) {
    applyTheme(loadPreferences().theme);
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      applyTheme(loadPreferences().theme);
    }, { once: true });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var pageShells;
    var appRoots;
    setupTwoScreenLayout();
    pageShells = document.querySelectorAll("[data-screen-shell]");
    appRoots = document.querySelectorAll(".sudoku-app");
    pageShells.forEach(function (root) {
      new ScreenPager(root);
    });
    appRoots.forEach(function (root) {
      new SudokuApp(root);
    });
  });
}());
