(function () {
  "use strict";

  var MIN_PUZZLE_ID = 1000;
  var MAX_PUZZLE_ID = 100000000;
  var ALLOWED_QUERY_KEYS = ["p"];
  var STORAGE_KEY = "sudokus_kids_preferences_v1";
  var ICON_THEMES = [
    {
      name: "Animals",
      symbols: ["🐶", "🐱", "🐭", "🐹"],
      labels: ["dog", "cat", "mouse", "hamster"]
    },
    {
      name: "Fruits",
      symbols: ["🍎", "🍌", "🍓", "🍇"],
      labels: ["apple", "banana", "strawberry", "grapes"]
    },
    {
      name: "Faces",
      symbols: ["😀", "😎", "🥳", "🤖"],
      labels: ["smiley face", "cool face", "party face", "robot"]
    }
  ];
  var MODE_META = {
    mini: {
      label: "Mini Sudoku",
      size: 4,
      boxRows: 2,
      boxCols: 2,
      typeLabel: "4x4 numbers",
      intro: "A simple 4x4 Sudoku with the numbers 1 to 4.",
      ariaLabel: "Mini Sudoku board"
    },
    picture: {
      label: "Picture Sudoku",
      size: 4,
      boxRows: 2,
      boxCols: 2,
      typeLabel: "4x4 picture puzzle",
      intro: "The same Sudoku rules, but with friendly icons instead of numbers.",
      ariaLabel: "Picture Sudoku board"
    },
    junior: {
      label: "Junior Sudoku",
      size: 6,
      boxRows: 2,
      boxCols: 3,
      typeLabel: "6x6 numbers",
      intro: "A 6x6 Sudoku that helps kids move toward the classic puzzle.",
      ariaLabel: "Junior Sudoku board"
    }
  };
  var BASE_PUZZLES = {
    mini: [
      {
        puzzle: "1004341001434020",
        solution: "1234341221434321"
      },
      {
        puzzle: "0204041001004301",
        solution: "1234341221434321"
      },
      {
        puzzle: "1030041200034300",
        solution: "1234341221434321"
      },
      {
        puzzle: "0034340001404001",
        solution: "1234341221434321"
      }
    ],
    junior: [
      {
        puzzle: "103056050103201560064031310605605010",
        solution: "123456456123231564564231312645645312"
      },
      {
        puzzle: "120006400120001560560200312045045310",
        solution: "123456456123231564564231312645645312"
      },
      {
        puzzle: "100450056003231004500201010645640010",
        solution: "123456456123231564564231312645645312"
      },
      {
        puzzle: "003406450020031500500031300045040300",
        solution: "123456456123231564564231312645645312"
      }
    ]
  };
  var BUTTON_ICONS = {
    share: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M14 5h5v5h-2V8.41l-5.29 5.3-1.42-1.42L15.59 7H14V5Zm3 14H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5v2H7v9h9v-4h2v5a1 1 0 0 1-1 1Z\" fill=\"currentColor\"/></svg>",
    print: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M7 4h10v4H7V4Zm10 10h2v-3a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v3h2v5h10v-5Zm-2 3H9v-5h6v5Zm2-9V3H7v5H4a2 2 0 0 0-2 2v5h3v6h14v-6h3v-5a2 2 0 0 0-2-2h-3Z\" fill=\"currentColor\"/></svg>"
  };

  function loadPreferences() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return {
        autoCheck: parsed.autoCheck !== false
      };
    } catch (error) {
      return {
        autoCheck: true
      };
    }
  }

  function savePreferences(preferences) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      return;
    }
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

  function createGroupedAxisOrder(groupCount, groupSize, random) {
    var groups = shuffleWithRandom(Array.from({ length: groupCount }, function (_, index) {
      return index;
    }), random);
    var order = [];
    groups.forEach(function (group) {
      shuffleWithRandom(Array.from({ length: groupSize }, function (_, index) {
        return index;
      }), random).forEach(function (offset) {
        order.push(group * groupSize + offset);
      });
    });
    return order;
  }

  function createDigitMap(size, random) {
    var digits = shuffleWithRandom(Array.from({ length: size }, function (_, index) {
      return index + 1;
    }), random);
    var map = ["0"];
    digits.forEach(function (digit, index) {
      map[index + 1] = String(digit);
    });
    return map;
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

  function getAllowedParamsFromUrl() {
    var url = getCurrentUrlObject();
    var rawPuzzleId;
    var normalizedPuzzleId;
    if (!url) {
      return {
        p: null,
        invalidRawId: null,
        hasPuzzleParam: false
      };
    }
    rawPuzzleId = url.searchParams.get("p");
    normalizedPuzzleId = normalizePuzzleId(rawPuzzleId);
    return {
      p: normalizedPuzzleId,
      invalidRawId: rawPuzzleId && !normalizedPuzzleId ? rawPuzzleId : null,
      hasPuzzleParam: url.searchParams.has("p") && Boolean(normalizedPuzzleId)
    };
  }

  function buildCleanRelativeUrl(pathname, params) {
    var search = [];
    ALLOWED_QUERY_KEYS.forEach(function (key) {
      if (params && params[key]) {
        search.push(key + "=" + encodeURIComponent(String(params[key])));
      }
    });
    return pathname + (search.length ? "?" + search.join("&") : "");
  }

  function buildCleanAbsoluteUrl(pathname, params) {
    var url = getCurrentUrlObject();
    var origin = url ? url.origin : "https://sudoku-play.org";
    return origin + buildCleanRelativeUrl(pathname, params);
  }

  function syncSeoMeta(pathname, seed, includeSeed) {
    var canonical = document.querySelector("link[rel='canonical']");
    var ogUrl = document.querySelector("meta[property='og:url']");
    var robots = document.querySelector("meta[name='robots']");
    var params = {};
    var route;
    if (includeSeed && normalizePuzzleId(seed)) {
      params.p = normalizePuzzleId(seed);
    }
    route = buildCleanAbsoluteUrl(pathname, params);
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
      robots.setAttribute("content", params.p ? "noindex, follow" : "index, follow");
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  function syncCleanLocation(pathname, seed, includeSeed) {
    var cleanUrl = buildCleanRelativeUrl(pathname, includeSeed ? { p: seed } : {});
    try {
      window.history.replaceState({}, "", cleanUrl);
    } catch (error) {
      return;
    }
  }

  function getRandomPuzzleId(excludeSeed, previousSeed) {
    var candidate = MIN_PUZZLE_ID + Math.floor(Math.random() * (MAX_PUZZLE_ID - MIN_PUZZLE_ID + 1));
    while (candidate === Number(excludeSeed) || candidate === Number(previousSeed)) {
      candidate = MIN_PUZZLE_ID + Math.floor(Math.random() * (MAX_PUZZLE_ID - MIN_PUZZLE_ID + 1));
    }
    return String(candidate);
  }

  function getNextPuzzleId(currentSeed) {
    var current = Number(currentSeed);
    if (!Number.isFinite(current) || current < MIN_PUZZLE_ID || current > MAX_PUZZLE_ID) {
      return String(MIN_PUZZLE_ID);
    }
    return String(current >= MAX_PUZZLE_ID ? MIN_PUZZLE_ID : current + 1);
  }

  function getTodaySeed() {
    var today = new Date();
    return String(today.getUTCFullYear()) +
      String(today.getUTCMonth() + 1).padStart(2, "0") +
      String(today.getUTCDate()).padStart(2, "0");
  }

  function transformGridString(board, size, rowOrder, columnOrder, digitMap) {
    var output = [];
    var row;
    var column;
    var sourceRow;
    var sourceColumn;
    var value;
    for (row = 0; row < size; row += 1) {
      for (column = 0; column < size; column += 1) {
        sourceRow = rowOrder[row];
        sourceColumn = columnOrder[column];
        value = board.charAt(sourceRow * size + sourceColumn);
        output.push(value === "0" ? "0" : digitMap[Number(value)]);
      }
    }
    return output.join("");
  }

  function getModeOffset(mode) {
    if (mode === "picture") {
      return 29;
    }
    if (mode === "junior") {
      return 47;
    }
    return 11;
  }

  function buildPuzzleFromSeed(mode, rawSeed) {
    var normalized = normalizePuzzleId(rawSeed);
    var config = MODE_META[mode];
    var bankKey = mode === "picture" ? "mini" : mode;
    var bank = BASE_PUZZLES[bankKey];
    var numericId;
    var random;
    var basePuzzle;
    var rowOrder;
    var columnOrder;
    var digitMap;
    var theme = null;
    if (!config || !normalized || !bank || !bank.length) {
      return null;
    }

    numericId = Number(normalized);
    random = createSeededRandom(numericId + getModeOffset(mode));
    basePuzzle = bank[(numericId - 1) % bank.length];
    rowOrder = createGroupedAxisOrder(config.size / config.boxRows, config.boxRows, random);
    columnOrder = createGroupedAxisOrder(config.size / config.boxCols, config.boxCols, random);
    digitMap = createDigitMap(config.size, random);

    if (mode === "picture") {
      theme = ICON_THEMES[(numericId + getModeOffset(mode)) % ICON_THEMES.length];
    }

    return {
      seed: normalized,
      mode: mode,
      theme: theme,
      puzzle: transformGridString(basePuzzle.puzzle, config.size, rowOrder, columnOrder, digitMap),
      solution: transformGridString(basePuzzle.solution, config.size, rowOrder, columnOrder, digitMap)
    };
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

  function createValueArray(size) {
    return Array.from({ length: size }, function (_, index) {
      return index + 1;
    });
  }

  function buildKidsMobileSummary(config, seed) {
    return config.label + " · #" + (seed || "--");
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

  function KidsSudokuApp(root) {
    this.root = root;
    this.mode = root.getAttribute("data-kids-mode") || "mini";
    this.config = MODE_META[this.mode];
    this.preferences = loadPreferences();
    this.currentPuzzle = null;
    this.currentSeed = null;
    this.selectedIndex = 0;
    this.cells = [];
    this.cellButtons = [];
    this.hasExplicitPuzzleParam = false;
    this.previousSeed = null;
    this.path = window.location.pathname || "/";
    this.liveRegion = root.querySelector("[data-kids-live]");
    this.boardEl = root.querySelector("[data-kids-board]");
    this.keypadEl = root.querySelector("[data-kids-keypad]");
    this.statusEl = root.querySelector("[data-kids-status]");
    this.seedEl = root.querySelector("[data-kids-seed]");
    this.themeEl = root.querySelector("[data-kids-theme]");
    this.typeEl = root.querySelector("[data-kids-type]");
    this.autoCheckButton = root.querySelector("[data-kids-action='toggle-auto-check']");
    this.copyButton = root.querySelector("[data-kids-action='copy']");
    this.mobilePanel = null;
    this.mobileStatusEl = null;
    this.mobileSeedEl = null;
    this.mobileThemeEl = null;
    this.mobileTypeEl = null;
    this.mobileSummaryEl = null;
    this.mobileAutoCheckButton = null;
    this.mobileCopyButton = null;
    this.titleEl = root.querySelector("[data-kids-mode-title]");
    this.introEl = root.querySelector("[data-kids-mode-intro]");
    this.modal = root.querySelector("[data-kids-modal]");
    if (this.modal && this.modal.parentNode !== document.body) {
      document.body.appendChild(this.modal);
    }
    this.modalSeed = this.modal ? this.modal.querySelector("[data-kids-modal-seed]") : null;
    this.invalidRequestedPuzzleId = null;

    if (!this.config || !this.boardEl || !this.keypadEl) {
      return;
    }

    this.root.classList.add("kids-app--" + this.mode);
    this.buildBoard();
    this.ensureMobilePanel();
    this.root.querySelectorAll("[data-kids-action='print']").forEach(function (button) {
      setButtonLabel(button, "print", "Print", {
        ariaLabel: "Print this puzzle",
        title: "Print this puzzle",
        iconOnlyOnMobile: button.closest(".mobile-game-panel") !== null
      });
    });
    this.root.querySelectorAll("[data-kids-action='copy']").forEach(function (button) {
      setButtonLabel(button, "share", "Share", {
        ariaLabel: "Share this puzzle",
        title: "Share this puzzle",
        iconOnlyOnMobile: button.closest(".mobile-game-panel") !== null
      });
    });
    if (this.modal) {
      this.modal.querySelectorAll("[data-kids-action='print']").forEach(function (button) {
        setButtonLabel(button, "print", "Print", {
          ariaLabel: "Print this puzzle",
          title: "Print this puzzle"
        });
      });
      this.modal.querySelectorAll("[data-kids-action='copy']").forEach(function (button) {
        setButtonLabel(button, "share", "Share", {
          ariaLabel: "Share this puzzle",
          title: "Share this puzzle"
        });
      });
    }
    this.bindEvents();
    this.applyPreferenceUi();
    this.startRequestedPuzzle();
  }

  KidsSudokuApp.prototype.buildBoard = function () {
    var fragment = document.createDocumentFragment();
    var total = this.config.size * this.config.size;
    var index;
    var row;
    var col;
    var button;
    this.boardEl.style.setProperty("--kids-grid-size", String(this.config.size));
    this.boardEl.setAttribute("aria-label", this.config.ariaLabel);

    for (index = 0; index < total; index += 1) {
      row = Math.floor(index / this.config.size);
      col = index % this.config.size;
      button = document.createElement("button");
      button.type = "button";
      button.className = "kids-cell";
      button.setAttribute("data-kids-index", String(index));
      if ((col + 1) % this.config.boxCols === 0 && col !== this.config.size - 1) {
        button.classList.add("kids-cell--col-divider");
      }
      if ((row + 1) % this.config.boxRows === 0 && row !== this.config.size - 1) {
        button.classList.add("kids-cell--row-divider");
      }
      fragment.appendChild(button);
      this.cellButtons.push(button);
    }
    this.boardEl.innerHTML = "";
    this.boardEl.appendChild(fragment);
  };

  KidsSudokuApp.prototype.buildKeypad = function () {
    var values = createValueArray(this.config.size);
    var self = this;
    this.keypadEl.innerHTML = "";
    values.forEach(function (value) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "kids-button kids-button--key";
      button.setAttribute("data-kids-value", String(value));
      button.setAttribute("aria-label", "Place " + self.getValueLabel(value));
      button.textContent = self.getDisplayValue(value);
      self.keypadEl.appendChild(button);
    });
  };

  KidsSudokuApp.prototype.ensureMobilePanel = function () {
    var center = this.root.querySelector(".kids-center");
    if (!center) {
      return;
    }
    this.mobilePanel = this.root.querySelector(".mobile-game-panel");
    if (!this.mobilePanel) {
      this.mobilePanel = document.createElement("details");
      this.mobilePanel.className = "mobile-game-panel mobile-game-panel--kids";
      this.mobilePanel.innerHTML = "" +
        "<summary class=\"mobile-game-panel__summary\">" +
          "<span class=\"mobile-game-panel__title\">Game menu</span>" +
          "<span class=\"mobile-game-panel__meta\" data-kids-mobile-summary>" + buildKidsMobileSummary(this.config, this.currentSeed) + "</span>" +
        "</summary>" +
        "<div class=\"mobile-game-panel__body\">" +
          "<div class=\"mobile-game-panel__stats\">" +
            "<div class=\"hud-card\"><span class=\"hud-card__label\">Type</span><strong class=\"hud-card__value\" data-kids-mobile-type>" + this.config.typeLabel + "</strong></div>" +
            "<div class=\"hud-card\"><span class=\"hud-card__label\">Puzzle ID</span><strong class=\"hud-card__value\" data-kids-mobile-seed>--</strong></div>" +
            "<div class=\"hud-card\"><span class=\"hud-card__label\">Theme</span><strong class=\"hud-card__value\" data-kids-mobile-theme>Numbers</strong></div>" +
            "<div class=\"hud-card hud-card--status mobile-game-panel__status\"><span class=\"hud-card__label\">Status</span><p class=\"status-line\" data-kids-mobile-status>Kids Sudoku is ready.</p></div>" +
          "</div>" +
          "<div class=\"mobile-game-panel__actions\">" +
            "<button class=\"kids-button\" type=\"button\" data-kids-action=\"new\">New Puzzle</button>" +
            "<button class=\"kids-button button-with-icon button--icon-only-mobile\" type=\"button\" data-kids-action=\"print\" aria-label=\"Print this puzzle\" title=\"Print this puzzle\"><span class=\"button-icon\" aria-hidden=\"true\">" + BUTTON_ICONS.print + "</span><span class=\"button-label\">Print</span></button>" +
            "<button class=\"kids-button button-with-icon button--icon-only-mobile\" type=\"button\" data-kids-action=\"copy\" aria-label=\"Share this puzzle\" title=\"Share this puzzle\"><span class=\"button-icon\" aria-hidden=\"true\">" + BUTTON_ICONS.share + "</span><span class=\"button-label\">Share</span></button>" +
            "<button class=\"kids-button\" type=\"button\" data-kids-action=\"toggle-auto-check\" aria-pressed=\"true\" data-kids-mobile-auto-check>Auto-check: On</button>" +
            "<button class=\"kids-button kids-button--soft\" type=\"button\" data-kids-action=\"clear\">Clear Cell</button>" +
          "</div>" +
        "</div>";
      center.insertBefore(this.mobilePanel, center.firstChild);
    }
    this.mobileStatusEl = this.mobilePanel.querySelector("[data-kids-mobile-status]");
    this.mobileSeedEl = this.mobilePanel.querySelector("[data-kids-mobile-seed]");
    this.mobileThemeEl = this.mobilePanel.querySelector("[data-kids-mobile-theme]");
    this.mobileTypeEl = this.mobilePanel.querySelector("[data-kids-mobile-type]");
    this.mobileSummaryEl = this.mobilePanel.querySelector("[data-kids-mobile-summary]");
    this.mobileAutoCheckButton = this.mobilePanel.querySelector("[data-kids-mobile-auto-check]");
    this.mobileCopyButton = this.mobilePanel.querySelector("[data-kids-action='copy']");
  };

  KidsSudokuApp.prototype.bindEvents = function () {
    var self = this;
    this.root.addEventListener("click", function (event) {
      var actionTarget = event.target.closest("[data-kids-action]");
      var cellTarget = event.target.closest("[data-kids-index]");
      var valueTarget = event.target.closest("[data-kids-value]");

      if (actionTarget) {
        self.handleAction(actionTarget.getAttribute("data-kids-action"));
        return;
      }

      if (cellTarget) {
        self.selectCell(Number(cellTarget.getAttribute("data-kids-index")), true);
        return;
      }

      if (valueTarget) {
        self.placeValue(Number(valueTarget.getAttribute("data-kids-value")));
      }
    });

    this.root.addEventListener("keydown", function (event) {
      var active = document.activeElement;
      var value;
      if (!self.root.contains(active)) {
        return;
      }

      if (event.key >= "1" && event.key <= String(self.config.size)) {
        event.preventDefault();
        self.placeValue(Number(event.key));
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        event.preventDefault();
        self.clearCell();
        return;
      }

      if (event.key === "ArrowUp") {
        self.moveSelection(-self.config.size);
        event.preventDefault();
        return;
      }
      if (event.key === "ArrowDown") {
        self.moveSelection(self.config.size);
        event.preventDefault();
        return;
      }
      if (event.key === "ArrowLeft") {
        self.moveSelection(-1);
        event.preventDefault();
        return;
      }
      if (event.key === "ArrowRight") {
        self.moveSelection(1);
        event.preventDefault();
      }
    });

    if (this.modal) {
      this.modal.addEventListener("click", function (event) {
        var actionTarget = event.target.closest("[data-kids-action]");
        if (actionTarget) {
          self.handleAction(actionTarget.getAttribute("data-kids-action"));
          return;
        }
        if (event.target === self.modal) {
          self.closeModal();
        }
      });
    }
  };

  KidsSudokuApp.prototype.startRequestedPuzzle = function () {
    var requested = getAllowedParamsFromUrl();
    var puzzle = null;
    var seed;
    this.invalidRequestedPuzzleId = requested.invalidRawId;
    this.hasExplicitPuzzleParam = requested.hasPuzzleParam;

    if (requested.p) {
      puzzle = buildPuzzleFromSeed(this.mode, requested.p);
    }

    if (!puzzle) {
      seed = getRandomPuzzleId(null, this.previousSeed);
      puzzle = buildPuzzleFromSeed(this.mode, seed);
    }

    this.startPuzzle(puzzle, this.hasExplicitPuzzleParam);
    if (this.invalidRequestedPuzzleId) {
      this.setStatus("Invalid puzzle ID. Loaded a random kids puzzle.");
    }
  };

  KidsSudokuApp.prototype.startPuzzle = function (puzzle, includeSeed) {
    var self = this;
    if (!puzzle) {
      return;
    }
    this.currentPuzzle = puzzle;
    this.currentSeed = puzzle.seed;
    this.cells = puzzle.puzzle.split("").map(function (char, index) {
      return {
        value: Number(char),
        solution: Number(puzzle.solution.charAt(index)),
        given: char !== "0"
      };
    });
    this.selectedIndex = this.findFirstEditableCell();
    this.previousSeed = puzzle.seed;
    this.buildKeypad();
    this.updateMetaUi();
    this.render();
    this.syncLocation(includeSeed);
    syncSeoMeta(this.path, this.currentSeed, includeSeed);
    this.closeModal();
    this.focusSelectedCell();
    this.setStatus(this.config.label + " is ready. Pick a cell and start.");
  };

  KidsSudokuApp.prototype.syncLocation = function (includeSeed) {
    syncCleanLocation(this.path, this.currentSeed, includeSeed);
  };

  KidsSudokuApp.prototype.updateMetaUi = function () {
    if (this.seedEl) {
      this.seedEl.textContent = this.currentSeed || "--";
    }
    if (this.themeEl) {
      this.themeEl.textContent = this.mode === "picture" && this.currentPuzzle && this.currentPuzzle.theme
        ? this.currentPuzzle.theme.name
        : "Numbers";
    }
    if (this.typeEl) {
      this.typeEl.textContent = this.config.typeLabel;
    }
    if (this.mobileTypeEl) {
      this.mobileTypeEl.textContent = this.config.typeLabel;
    }
    if (this.titleEl) {
      this.titleEl.textContent = this.config.label;
    }
    if (this.introEl) {
      this.introEl.textContent = this.config.intro;
    }
    if (this.modalSeed) {
      this.modalSeed.textContent = this.currentSeed || "--";
    }
    if (this.mobileSeedEl) {
      this.mobileSeedEl.textContent = this.currentSeed || "--";
    }
    if (this.mobileThemeEl) {
      this.mobileThemeEl.textContent = this.mode === "picture" && this.currentPuzzle && this.currentPuzzle.theme
        ? this.currentPuzzle.theme.name
        : "Numbers";
    }
    if (this.mobileSummaryEl) {
      this.mobileSummaryEl.textContent = buildKidsMobileSummary(this.config, this.currentSeed);
    }
  };

  KidsSudokuApp.prototype.applyPreferenceUi = function () {
    if (this.autoCheckButton) {
      this.autoCheckButton.classList.toggle("is-active", this.preferences.autoCheck);
      this.autoCheckButton.setAttribute("aria-pressed", this.preferences.autoCheck ? "true" : "false");
      this.autoCheckButton.textContent = "Auto-check: " + (this.preferences.autoCheck ? "On" : "Off");
    }
    if (this.mobileAutoCheckButton) {
      this.mobileAutoCheckButton.classList.toggle("is-active", this.preferences.autoCheck);
      this.mobileAutoCheckButton.setAttribute("aria-pressed", this.preferences.autoCheck ? "true" : "false");
      this.mobileAutoCheckButton.textContent = "Auto-check: " + (this.preferences.autoCheck ? "On" : "Off");
    }
  };

  KidsSudokuApp.prototype.findFirstEditableCell = function () {
    var index;
    for (index = 0; index < this.cells.length; index += 1) {
      if (!this.cells[index].given) {
        return index;
      }
    }
    return 0;
  };

  KidsSudokuApp.prototype.getDisplayValue = function (value) {
    if (!value) {
      return "";
    }
    if (this.mode === "picture" && this.currentPuzzle && this.currentPuzzle.theme) {
      return this.currentPuzzle.theme.symbols[value - 1];
    }
    return String(value);
  };

  KidsSudokuApp.prototype.getValueLabel = function (value) {
    if (this.mode === "picture" && this.currentPuzzle && this.currentPuzzle.theme) {
      return this.currentPuzzle.theme.labels[value - 1];
    }
    return String(value);
  };

  KidsSudokuApp.prototype.setStatus = function (message) {
    if (this.statusEl) {
      this.statusEl.textContent = message;
    }
    if (this.mobileStatusEl) {
      this.mobileStatusEl.textContent = message;
    }
    if (this.liveRegion) {
      this.liveRegion.textContent = message;
    }
  };

  KidsSudokuApp.prototype.isLinePeer = function (index) {
    var selectedRow = Math.floor(this.selectedIndex / this.config.size);
    var selectedCol = this.selectedIndex % this.config.size;
    var row = Math.floor(index / this.config.size);
    var col = index % this.config.size;
    if (index === this.selectedIndex) {
      return false;
    }
    return row === selectedRow || col === selectedCol;
  };

  KidsSudokuApp.prototype.isBlockPeer = function (index) {
    var selectedRow = Math.floor(this.selectedIndex / this.config.size);
    var selectedCol = this.selectedIndex % this.config.size;
    var row = Math.floor(index / this.config.size);
    var col = index % this.config.size;
    if (index === this.selectedIndex) {
      return false;
    }
    return Math.floor(row / this.config.boxRows) === Math.floor(selectedRow / this.config.boxRows) &&
      Math.floor(col / this.config.boxCols) === Math.floor(selectedCol / this.config.boxCols);
  };

  KidsSudokuApp.prototype.render = function () {
    var self = this;
    this.cells.forEach(function (cell, index) {
      var button = self.cellButtons[index];
      var isCorrect = !cell.given && cell.value && cell.value === cell.solution;
      var isWrong = !cell.given && cell.value && cell.value !== cell.solution;
      var className = "kids-cell";
      var row = Math.floor(index / self.config.size);
      var col = index % self.config.size;

      if ((col + 1) % self.config.boxCols === 0 && col !== self.config.size - 1) {
        className += " kids-cell--col-divider";
      }
      if ((row + 1) % self.config.boxRows === 0 && row !== self.config.size - 1) {
        className += " kids-cell--row-divider";
      }
      if (cell.given) {
        className += " kids-cell--given";
      }
      if (index === self.selectedIndex) {
        className += " kids-cell--selected";
      }
      if (isCorrect && self.preferences.autoCheck) {
        className += " kids-cell--correct";
      }
      if (isWrong) {
        className += " kids-cell--mistake";
      }
      if (self.isLinePeer(index)) {
        className += " kids-cell--line-peer";
      }
      if (self.isBlockPeer(index)) {
        className += " kids-cell--focus-block";
      }

      button.className = className;
      button.textContent = self.getDisplayValue(cell.value);
      button.setAttribute("tabindex", index === self.selectedIndex ? "0" : "-1");
      button.setAttribute("aria-selected", index === self.selectedIndex ? "true" : "false");
      button.setAttribute("aria-label", "Row " + (row + 1) + ", column " + (col + 1) + ", " + (cell.value ? self.getValueLabel(cell.value) : "empty"));
    });
  };

  KidsSudokuApp.prototype.selectCell = function (index, focusCell) {
    this.selectedIndex = index;
    this.render();
    if (focusCell) {
      this.focusSelectedCell();
    }
  };

  KidsSudokuApp.prototype.focusSelectedCell = function () {
    var button = this.cellButtons[this.selectedIndex];
    if (button) {
      button.focus();
    }
  };

  KidsSudokuApp.prototype.moveSelection = function (step) {
    var row = Math.floor(this.selectedIndex / this.config.size);
    var col = this.selectedIndex % this.config.size;
    if (step === -1 && col === 0) {
      return;
    }
    if (step === 1 && col === this.config.size - 1) {
      return;
    }
    if (step === -this.config.size && row === 0) {
      return;
    }
    if (step === this.config.size && row === this.config.size - 1) {
      return;
    }
    this.selectCell(this.selectedIndex + step, true);
  };

  KidsSudokuApp.prototype.placeValue = function (value) {
    var cell = this.cells[this.selectedIndex];
    if (!cell || cell.given) {
      this.setStatus("Pick an empty cell first.");
      return;
    }
    cell.value = cell.value === value ? 0 : value;
    this.render();
    if (!cell.value) {
      this.setStatus("Cell cleared.");
      return;
    }
    if (cell.value === cell.solution) {
      this.setStatus("Nice move.");
    } else {
      this.setStatus("Try a different " + (this.mode === "picture" ? "icon." : "number."));
    }
    this.checkSolved();
  };

  KidsSudokuApp.prototype.clearCell = function () {
    var cell = this.cells[this.selectedIndex];
    if (!cell || cell.given) {
      this.setStatus("This cell cannot be changed.");
      return;
    }
    cell.value = 0;
    this.render();
    this.setStatus("Cell cleared.");
  };

  KidsSudokuApp.prototype.handleAction = function (action) {
    var nextSeed;
    if (action === "new") {
      nextSeed = getRandomPuzzleId(this.currentSeed, this.previousSeed);
      this.hasExplicitPuzzleParam = true;
      this.startPuzzle(buildPuzzleFromSeed(this.mode, nextSeed), true);
      return;
    }
    if (action === "next") {
      nextSeed = getNextPuzzleId(this.currentSeed);
      this.hasExplicitPuzzleParam = true;
      this.startPuzzle(buildPuzzleFromSeed(this.mode, nextSeed), true);
      return;
    }
    if (action === "copy") {
      this.copyLink();
      return;
    }
    if (action === "print") {
      this.printPuzzle();
      return;
    }
    if (action === "toggle-auto-check") {
      this.preferences.autoCheck = !this.preferences.autoCheck;
      savePreferences(this.preferences);
      this.applyPreferenceUi();
      this.render();
      this.setStatus(this.preferences.autoCheck ? "Auto-check is on." : "Auto-check is off.");
      return;
    }
    if (action === "clear") {
      this.clearCell();
    }
  };

  KidsSudokuApp.prototype.copyLink = function () {
    var self = this;
    var absoluteUrl;
    this.hasExplicitPuzzleParam = true;
    this.syncLocation(true);
    absoluteUrl = buildCleanAbsoluteUrl(this.path, { p: this.currentSeed });
    copyText(absoluteUrl).then(function () {
      if (self.copyButton) {
        setButtonLabel(self.copyButton, "share", "Copied", {
          ariaLabel: "Puzzle link copied",
          title: "Puzzle link copied"
        });
        window.setTimeout(function () {
          setButtonLabel(self.copyButton, "share", "Share", {
            ariaLabel: "Share this puzzle",
            title: "Share this puzzle"
          });
        }, 1400);
      }
      if (self.mobileCopyButton) {
        setButtonLabel(self.mobileCopyButton, "share", "Copied", {
          ariaLabel: "Puzzle link copied",
          title: "Puzzle link copied",
          iconOnlyOnMobile: true
        });
        window.setTimeout(function () {
          setButtonLabel(self.mobileCopyButton, "share", "Share", {
            ariaLabel: "Share this puzzle",
            title: "Share this puzzle",
            iconOnlyOnMobile: true
          });
        }, 1400);
      }
      self.setStatus("Puzzle link copied.");
    }).catch(function () {
      self.setStatus("Unable to copy the link on this browser.");
    });
  };

  KidsSudokuApp.prototype.getPrintShareUrl = function () {
    if (!this.currentSeed) {
      return buildCleanAbsoluteUrl(this.path, {});
    }
    return buildCleanAbsoluteUrl(this.path, { p: this.currentSeed });
  };

  KidsSudokuApp.prototype.buildPrintGridMarkup = function () {
    var puzzle = this.currentPuzzle ? this.currentPuzzle.puzzle : "";
    var size = this.config.size;
    var cells = [];
    var index;
    var row;
    var column;
    var value;
    var classes;
    for (index = 0; index < puzzle.length; index += 1) {
      row = Math.floor(index / size);
      column = index % size;
      value = Number(puzzle.charAt(index));
      classes = ["print-grid__cell"];
      if (column === size - 1) {
        classes.push("print-grid__cell--edge-right");
      }
      if (row === size - 1) {
        classes.push("print-grid__cell--edge-bottom");
      }
      if ((column + 1) % this.config.boxCols === 0 && column !== size - 1) {
        classes.push("print-grid__cell--divider-right");
      }
      if ((row + 1) % this.config.boxRows === 0 && row !== size - 1) {
        classes.push("print-grid__cell--divider-bottom");
      }
      if (!value) {
        classes.push("print-grid__cell--empty");
      }
      cells.push("<div class=\"" + classes.join(" ") + "\">" + (value ? escapeHtml(this.getDisplayValue(value)) : "") + "</div>");
    }
    return cells.join("");
  };

  KidsSudokuApp.prototype.buildPrintDocument = function (qrMarkup) {
    var size = this.config.size;
    var title = this.config.label;
    var puzzleId = this.currentSeed || "--";
    var typeLabel = this.config.typeLabel;
    var borderMm = size === 6 ? 1.8 : 2.1;
    var innerMm = size === 6 ? 0.7 : 0.9;
    var gridWidth = size === 6 ? "126mm" : "118mm";
    var fontSize = size === 6 ? "6.1mm" : "8.3mm";
    return "<!doctype html>" +
      "<html lang=\"en\">" +
      "<head>" +
        "<meta charset=\"utf-8\">" +
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
        "<title>" + escapeHtml(title) + " - Puzzle #" + escapeHtml(puzzleId) + "</title>" +
        "<style>" +
          "@page{size:A4 portrait;margin:14mm;}" +
          "html,body{margin:0;padding:0;background:#fff;color:#111;font-family:\"SF Pro Text\",\"Segoe UI\",Arial,sans-serif;}" +
          ".print-page{position:relative;min-height:100vh;display:flex;justify-content:center;}" +
          ".print-page::before{content:\"Sudoku-Play.org — Free Online Sudoku\";position:fixed;left:50%;top:42%;transform:translate(-50%,-50%) rotate(-16deg);font-size:34px;font-weight:700;letter-spacing:.04em;color:rgba(190,40,65,.045);pointer-events:none;white-space:nowrap;}" +
          ".print-sheet{position:relative;width:180mm;display:grid;gap:5.5mm;justify-items:center;}" +
          ".print-header{width:100%;display:grid;gap:1.8mm;text-align:center;}" +
          ".print-header__brand{font-size:17px;font-weight:700;letter-spacing:-.02em;}" +
          ".print-header__title{font-size:27px;font-weight:700;letter-spacing:-.03em;}" +
          ".print-meta{display:flex;justify-content:center;gap:4.5mm;flex-wrap:wrap;font-size:12.5px;color:#333;}" +
          ".print-grid{display:grid;grid-template-columns:repeat(" + size + ",1fr);width:" + gridWidth + ";aspect-ratio:1;border:" + borderMm + "mm solid #1d1d1d;background:#fff;}" +
          ".print-grid__cell{display:flex;align-items:center;justify-content:center;border-right:" + innerMm + "mm solid #7c7c7c;border-bottom:" + innerMm + "mm solid #7c7c7c;font-size:" + fontSize + ";font-weight:700;color:#111;}" +
          ".print-grid__cell--empty{color:transparent;}" +
          ".print-grid__cell--edge-right{border-right:0;}" +
          ".print-grid__cell--edge-bottom{border-bottom:0;}" +
          ".print-grid__cell--divider-right{border-right:" + borderMm + "mm solid #1d1d1d;}" +
          ".print-grid__cell--divider-bottom{border-bottom:" + borderMm + "mm solid #1d1d1d;}" +
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
                "<span>Type: " + escapeHtml(typeLabel) + "</span>" +
                "<span>Puzzle ID: " + escapeHtml(puzzleId) + "</span>" +
              "</div>" +
            "</header>" +
            "<section class=\"print-grid\" aria-label=\"Printable kids Sudoku puzzle\">" +
              this.buildPrintGridMarkup() +
            "</section>" +
            "<footer class=\"print-footer\">" +
              "<div class=\"print-branding\">" +
                "<div class=\"print-branding__line\">Sudoku-Play.org — Puzzle #" + escapeHtml(puzzleId) + "</div>" +
                "<div>" + escapeHtml(title) + " printable puzzle.</div>" +
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

  KidsSudokuApp.prototype.printPuzzle = function () {
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
      var qrMarkup = buildPrintQrMarkup(self.getPrintShareUrl(), 144, self.currentSeed);
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
      self.setStatus("Opening print dialog for puzzle " + self.currentSeed + ".");
    }).catch(function () {
      self.setStatus("Unable to build the QR code for printing.");
    });
  };

  KidsSudokuApp.prototype.checkSolved = function () {
    var solved = this.cells.every(function (cell) {
      return cell.value === cell.solution;
    });
    if (!solved) {
      return;
    }
    this.openModal();
    this.setStatus("Puzzle solved. Great job!");
  };

  KidsSudokuApp.prototype.openModal = function () {
    if (this.modal) {
      this.modal.classList.add("is-open");
    }
  };

  KidsSudokuApp.prototype.closeModal = function () {
    if (this.modal) {
      this.modal.classList.remove("is-open");
    }
  };

  function setupDailyKidsBlock() {
    var seed = getTodaySeed();
    document.querySelectorAll("[data-kids-daily-seed]").forEach(function (node) {
      node.textContent = seed;
    });
    document.querySelectorAll("[data-kids-daily-link]").forEach(function (node) {
      node.setAttribute("href", "/mini-sudoku/?p=" + seed);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupDailyKidsBlock();
    document.querySelectorAll(".kids-app").forEach(function (root) {
      new KidsSudokuApp(root);
    });
  });
}());
