(function () {
  "use strict";

  var MINI_SYMBOLS = {
    "1": "😀",
    "2": "😎",
    "3": "🥳",
    "4": "🤖"
  };
  var MINI_LEVELS = [
    { puzzle: "1004341001434020", solution: "1234341221434321" },
    { puzzle: "0204041001004301", solution: "1234341221434321" },
    { puzzle: "1030041200034300", solution: "1234341221434321" },
    { puzzle: "0034340001404001", solution: "1234341221434321" },
    { puzzle: "2004342002434010", solution: "2134342112434312" },
    { puzzle: "0104042002004302", solution: "2134342112434312" },
    { puzzle: "2030042100034300", solution: "2134342112434312" },
    { puzzle: "0034340002404002", solution: "2134342112434312" },
    { puzzle: "1003431001343020", solution: "1243431221343421" },
    { puzzle: "0203031001003401", solution: "1243431221343421" }
  ];
  var ROUTES = {
    home: { path: "index.html" },
    daily: { url: "https://sudoku-play.org/daily-sudoku/" },
    kids: { url: "https://sudoku-play.org/sudoku-for-kids/" },
    guide: { url: "https://sudoku-play.org/guide/" }
  };
  var miniState = {
    levelIndex: 0,
    selectedIndex: null,
    values: [],
    solution: [],
    givenIndexes: [],
    solved: false
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

  function getCurrentLevel() {
    return MINI_LEVELS[miniState.levelIndex];
  }

  function isMiniGiven(index) {
    return miniState.givenIndexes.indexOf(index) !== -1;
  }

  function toSymbol(value) {
    return MINI_SYMBOLS[value] || "";
  }

  function findFirstEditableIndex() {
    var index;
    for (index = 0; index < miniState.values.length; index += 1) {
      if (!isMiniGiven(index)) {
        return index;
      }
    }
    return null;
  }

  function showMiniModal() {
    var modal = document.getElementById("mini-modal");
    var copy = document.getElementById("mini-modal-copy");
    var nextButtonTitle = document.querySelector("#mini-next-level .launch-button__title");
    var nextButtonMeta = document.querySelector("#mini-next-level .launch-button__meta");
    var isLastLevel = miniState.levelIndex === MINI_LEVELS.length - 1;

    copy.textContent = isLastLevel
      ? "You finished all 10 popup levels. Start again or jump to the full 9x9 Sudoku board."
      : "Go to the next popup level or open the full 9x9 Sudoku board.";
    nextButtonTitle.textContent = isLastLevel ? "Start Again" : "Next Level";
    nextButtonMeta.textContent = isLastLevel
      ? "Restart the popup level pack from level 1"
      : "Load the next mini puzzle in the popup";
    modal.hidden = false;
  }

  function hideMiniModal() {
    document.getElementById("mini-modal").hidden = true;
  }

  function renderMiniBoard() {
    var cells = document.querySelectorAll(".preview-cell");
    var status = document.getElementById("mini-status");
    var progress = document.getElementById("mini-progress");
    var solved = miniState.values.join("") === miniState.solution.join("");

    progress.textContent = "Level " + (miniState.levelIndex + 1) + " of " + MINI_LEVELS.length;

    Array.prototype.forEach.call(cells, function (cell) {
      var index = Number(cell.getAttribute("data-cell"));
      var value = miniState.values[index];
      var expected = miniState.solution[index];
      var isGiven = isMiniGiven(index);
      var isSelected = miniState.selectedIndex === index;
      var hasValue = value !== "0";
      var isWrong = !isGiven && hasValue && value !== expected;
      var isCorrect = !isGiven && hasValue && value === expected;

      cell.textContent = toSymbol(value);
      cell.classList.toggle("is-given", isGiven);
      cell.classList.toggle("is-selected", isSelected);
      cell.classList.toggle("is-wrong", isWrong);
      cell.classList.toggle("is-correct", isCorrect);
      cell.setAttribute(
        "aria-label",
        "Cell " + (index + 1) + (hasValue ? ", value " + toSymbol(value) : ", empty")
      );
    });

    if (solved) {
      status.textContent = "Mini 4x4 solved. Nice quick win.";
      if (!miniState.solved) {
        miniState.solved = true;
        showMiniModal();
      }
      return;
    }
    miniState.solved = false;
    status.textContent = "Finish the 4x4 mini Sudoku here, or open the full board below.";
  }

  function selectMiniCell(index) {
    if (isMiniGiven(index)) {
      return;
    }
    miniState.selectedIndex = index;
    renderMiniBoard();
  }

  function setMiniValue(value) {
    if (miniState.selectedIndex === null || isMiniGiven(miniState.selectedIndex) || miniState.solved) {
      return;
    }
    miniState.values[miniState.selectedIndex] = value;
    renderMiniBoard();
  }

  function loadMiniLevel(levelIndex) {
    var level = MINI_LEVELS[levelIndex];

    miniState.levelIndex = levelIndex;
    miniState.values = level.puzzle.split("");
    miniState.solution = level.solution.split("");
    miniState.givenIndexes = level.puzzle.split("").reduce(function (result, value, index) {
      if (value !== "0") {
        result.push(index);
      }
      return result;
    }, []);
    miniState.selectedIndex = findFirstEditableIndex();
    miniState.solved = false;
    hideMiniModal();
    renderMiniBoard();
  }

  function goToNextMiniLevel() {
    var nextIndex = miniState.levelIndex + 1;
    if (nextIndex >= MINI_LEVELS.length) {
      nextIndex = 0;
    }
    loadMiniLevel(nextIndex);
  }

  function buildMiniPad() {
    var pad = document.getElementById("mini-pad");
    if (!pad) {
      return;
    }

    ["1", "2", "3", "4"].forEach(function (digit) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "mini-pad__button";
      button.textContent = toSymbol(digit);
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
      setMiniValue("0");
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
      var numericIndex = Number(event.key);
      if (/^[1-4]$/.test(event.key)) {
        setMiniValue(String(numericIndex));
      }
      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        setMiniValue("0");
      }
      if (event.key === "Escape") {
        hideMiniModal();
      }
    });
  }

  function bindModalActions() {
    document.getElementById("mini-next-level").addEventListener("click", goToNextMiniLevel);
    document.getElementById("mini-open-full").addEventListener("click", function () {
      openRoute("home");
    });
    document.querySelector(".mini-modal__scrim").addEventListener("click", hideMiniModal);
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildMiniPad();
    bindMiniBoard();
    bindModalActions();
    loadMiniLevel(0);

    Array.prototype.forEach.call(document.querySelectorAll("[data-route]"), function (button) {
      button.addEventListener("click", function () {
        openRoute(button.getAttribute("data-route"));
      });
    });
  });
})();
