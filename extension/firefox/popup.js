(function () {
  "use strict";

  var MINI_PUZZLE = {
    puzzle: ["9", "", "4", "", "6", "", "5", "", "8"],
    solution: ["9", "1", "4", "7", "6", "2", "5", "3", "8"],
    givenIndexes: [0, 2, 4, 6, 8]
  };
  var ROUTES = {
    home: { path: "index.html" },
    daily: { url: "https://sudoku-play.org/daily-sudoku/" },
    kids: { url: "https://sudoku-play.org/sudoku-for-kids/" },
    guide: { url: "https://sudoku-play.org/guide/" }
  };
  var miniState = {
    selectedIndex: 1,
    values: MINI_PUZZLE.puzzle.slice()
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

  function isMiniGiven(index) {
    return MINI_PUZZLE.givenIndexes.indexOf(index) !== -1;
  }

  function renderMiniBoard() {
    var cells = document.querySelectorAll(".preview-cell");
    var status = document.getElementById("mini-status");
    var solved = miniState.values.join("") === MINI_PUZZLE.solution.join("");

    Array.prototype.forEach.call(cells, function (cell) {
      var index = Number(cell.getAttribute("data-cell"));
      var value = miniState.values[index];
      var expected = MINI_PUZZLE.solution[index];
      var isGiven = isMiniGiven(index);
      var isSelected = miniState.selectedIndex === index;
      var isWrong = !isGiven && value && value !== expected;
      var isCorrect = !isGiven && value && value === expected;

      cell.textContent = value;
      cell.classList.toggle("is-selected", isSelected);
      cell.classList.toggle("is-wrong", isWrong);
      cell.classList.toggle("is-correct", isCorrect);
      cell.setAttribute("aria-label", "Cell " + (index + 1) + (value ? ", value " + value : ", empty"));
    });

    if (solved) {
      status.textContent = "Mini grid solved. Nice quick win.";
      return;
    }
    status.textContent = "Finish the mini grid here, or open the full board below.";
  }

  function selectMiniCell(index) {
    if (isMiniGiven(index)) {
      return;
    }
    miniState.selectedIndex = index;
    renderMiniBoard();
  }

  function setMiniValue(value) {
    if (miniState.selectedIndex === null || isMiniGiven(miniState.selectedIndex)) {
      return;
    }
    miniState.values[miniState.selectedIndex] = value;
    renderMiniBoard();
  }

  function buildMiniPad() {
    var pad = document.getElementById("mini-pad");
    if (!pad) {
      return;
    }
    ["1", "2", "3", "4", "5", "6", "7", "8", "9"].forEach(function (digit) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "mini-pad__button";
      button.textContent = digit;
      button.addEventListener("click", function () {
        setMiniValue(digit);
      });
      pad.appendChild(button);
    });

    var clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "mini-pad__button is-clear";
    clearButton.textContent = "Clear";
    clearButton.addEventListener("click", function () {
      setMiniValue("");
    });
    pad.appendChild(clearButton);
  }

  function bindMiniBoard() {
    Array.prototype.forEach.call(document.querySelectorAll(".preview-cell"), function (cell) {
      cell.addEventListener("click", function () {
        selectMiniCell(Number(cell.getAttribute("data-cell")));
      });
    });

    document.addEventListener("keydown", function (event) {
      if (/^[1-9]$/.test(event.key)) {
        setMiniValue(event.key);
      }
      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        setMiniValue("");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildMiniPad();
    bindMiniBoard();
    renderMiniBoard();

    Array.prototype.forEach.call(document.querySelectorAll("[data-route]"), function (button) {
      button.addEventListener("click", function () {
        openRoute(button.getAttribute("data-route"));
      });
    });
  });
})();
