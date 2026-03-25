(function () {
  "use strict";

  var PUZZLES = [
    { id: "easy-001", difficulty: "Easy", puzzle: "490000607365904080027008000006003079083090040040687030872006003500012060610000725", solution: "498321657365974281127568394256143879783295146941687532872456913539712468614839725" },
    { id: "easy-002", difficulty: "Easy", puzzle: "790040200320900560860025007410800375003654800500001900007018600049000002050279010", solution: "795146238321987564864325197416892375973654821582731946237418659149563782658279413" },
    { id: "easy-003", difficulty: "Easy", puzzle: "000584000184900200900300468475290800200643509300050000709000301031809740040007005", solution: "623584917184976253957312468475291836218643579396758124769425381531869742842137695" },
    { id: "easy-004", difficulty: "Easy", puzzle: "060005002007020409021300000436700280090204067072638504680090073019873000700000020", solution: "364985712857126439921347856436759281598214367172638594685492173219873645743561928" },
    { id: "medium-001", difficulty: "Medium", puzzle: "086009030300004980974800000210000040705400010003020600009008360830040190000002070", solution: "186259437352674981974831526218965743765483219493127658529718364837546192641392875" },
    { id: "medium-002", difficulty: "Medium", puzzle: "900305070510607200300428900004030000069502040703900060035000080000070400200800600", solution: "942315876518697234376428951854736129169582347723941568435169782681273495297854613" },
    { id: "medium-003", difficulty: "Medium", puzzle: "954830021000009050600041009010702506000005000205090800000008000000400960543910007", solution: "954837621137629458682541739319782546478365192265194873796258314821473965543916287" },
    { id: "medium-004", difficulty: "Medium", puzzle: "872010000400000913003040082908004000546072000207800009080020007750600020000000405", solution: "872319654465287913193546782938154276546972831217863549389425167754691328621738495" },
    { id: "hard-001", difficulty: "Hard", puzzle: "000007000000000060257901000012704000000000050080293710001500070804002000300070680", solution: "168347925439825167257961348912754836743186259586293714691538472874612593325479681" },
    { id: "hard-002", difficulty: "Hard", puzzle: "085920003020030001000508000300000000070305419050006000240100008000000100003204005", solution: "785921643924637581136548297398412756672385419451796832247159368569873124813264975" },
    { id: "hard-003", difficulty: "Hard", puzzle: "000000800000020930107000506010263080000180069008004100080002040061000000009300010", solution: "392651874856427931147839526915263487274185369638794152783912645461578293529346718" },
    { id: "hard-004", difficulty: "Hard", puzzle: "000106009050290306800000000000001074510040003003607010005000030000800105490000600", solution: "234156789751298346869473251682531974517942863943687512125769438376824195498315627" },
    { id: "expert-001", difficulty: "Expert", puzzle: "000046050103000006000003420260000000300005008009000030400090385000800200006002090", solution: "782146953143259876695783421268317549374925618519468732427691385951834267836572194" },
    { id: "expert-002", difficulty: "Expert", puzzle: "008030000000008002000004090006002500000009410003100009301020007500001030207000006", solution: "128936745794518362635274891916342578872659413453187629361425987589761234247893156" },
    { id: "expert-003", difficulty: "Expert", puzzle: "020080000510000602000300008300000040095001000000930010000008060204600000000045007", solution: "923586471518479632647312958361257849495861723782934516159728364274693185836145297" },
    { id: "expert-004", difficulty: "Expert", puzzle: "200000083000089000008002154800000300070000400040057200402190000700503000000600000", solution: "267415983514389762938762154821946375675231498349857216452198637796523841183674529" }
  ];

  var boardElement = null;
  var numberPadElement = null;
  var progressValueElement = null;
  var selectedValueElement = null;
  var difficultyBadgeElement = null;
  var puzzleCountElement = null;
  var statusMessageElement = null;
  var cells = [];
  var state = {
    puzzleIndex: 0,
    selectedIndex: null,
    given: [],
    values: [],
    solution: ""
  };

  function getRow(index) {
    return Math.floor(index / 9);
  }

  function getColumn(index) {
    return index % 9;
  }

  function getBox(index) {
    return Math.floor(getRow(index) / 3) * 3 + Math.floor(getColumn(index) / 3);
  }

  function isRelated(index, selectedIndex) {
    if (selectedIndex === null || index === selectedIndex) {
      return false;
    }
    return getRow(index) === getRow(selectedIndex) ||
      getColumn(index) === getColumn(selectedIndex) ||
      getBox(index) === getBox(selectedIndex);
  }

  function getConflictIndexes(values) {
    var conflicts = new Set();

    function markDuplicates(unitIndexes) {
      var groups = {};
      unitIndexes.forEach(function (index) {
        var value = values[index];
        if (!value) {
          return;
        }
        if (!groups[value]) {
          groups[value] = [];
        }
        groups[value].push(index);
      });
      Object.keys(groups).forEach(function (key) {
        if (groups[key].length > 1) {
          groups[key].forEach(function (index) {
            conflicts.add(index);
          });
        }
      });
    }

    for (var row = 0; row < 9; row += 1) {
      markDuplicates(Array.from({ length: 9 }, function (_, offset) {
        return row * 9 + offset;
      }));
    }

    for (var column = 0; column < 9; column += 1) {
      markDuplicates(Array.from({ length: 9 }, function (_, offset) {
        return offset * 9 + column;
      }));
    }

    for (var boxRow = 0; boxRow < 3; boxRow += 1) {
      for (var boxColumn = 0; boxColumn < 3; boxColumn += 1) {
        markDuplicates(Array.from({ length: 9 }, function (_, offset) {
          var localRow = Math.floor(offset / 3);
          var localColumn = offset % 3;
          return (boxRow * 3 + localRow) * 9 + (boxColumn * 3 + localColumn);
        }));
      }
    }

    return conflicts;
  }

  function getFilledCount() {
    return state.values.filter(function (value) {
      return value !== "";
    }).length;
  }

  function getSelectedLabel() {
    if (state.selectedIndex === null) {
      return "Pick a cell";
    }
    return "Row " + (getRow(state.selectedIndex) + 1) + ", column " + (getColumn(state.selectedIndex) + 1);
  }

  function setStatus(message, tone) {
    statusMessageElement.textContent = message;
    statusMessageElement.classList.toggle("is-success", tone === "success");
    statusMessageElement.classList.toggle("is-warning", tone === "warning");
  }

  function updateStatus(conflicts) {
    var solved = state.values.join("") === state.solution;
    var remaining = 81 - getFilledCount();

    progressValueElement.textContent = getFilledCount() + " / 81";
    selectedValueElement.textContent = getSelectedLabel();
    difficultyBadgeElement.textContent = PUZZLES[state.puzzleIndex].difficulty;
    puzzleCountElement.textContent = "Puzzle " + (state.puzzleIndex + 1) + " of " + PUZZLES.length;

    if (solved) {
      setStatus("Solved. Nice work.", "success");
      return;
    }
    if (conflicts.size > 0) {
      setStatus("There are conflicting numbers in the grid.", "warning");
      return;
    }
    if (remaining === 0) {
      setStatus("All cells are filled. Check the board for any mistakes.", "warning");
      return;
    }
    setStatus("Pick a cell and use the number pad or keyboard to play.");
  }

  function renderBoard() {
    var conflicts = getConflictIndexes(state.values);
    var selectedValue = state.selectedIndex === null ? "" : state.values[state.selectedIndex];

    cells.forEach(function (cell, index) {
      var value = state.values[index];
      var isGiven = state.given[index];
      var isSelected = index === state.selectedIndex;
      var isSameValue = selectedValue && value && selectedValue === value && !isSelected;

      cell.textContent = value;
      cell.classList.toggle("cell--given", isGiven);
      cell.classList.toggle("cell--selected", isSelected);
      cell.classList.toggle("cell--related", isRelated(index, state.selectedIndex));
      cell.classList.toggle("cell--same-value", isSameValue);
      cell.classList.toggle("cell--conflict", conflicts.has(index));
      cell.setAttribute("aria-label", "Row " + (getRow(index) + 1) + ", column " + (getColumn(index) + 1) + (value ? ", value " + value : ", empty"));
    });

    updateStatus(conflicts);
  }

  function selectCell(index) {
    state.selectedIndex = index;
    renderBoard();
    cells[index].focus();
  }

  function loadPuzzle(index) {
    var puzzle = PUZZLES[index];
    state.puzzleIndex = index;
    state.solution = puzzle.solution;
    state.given = puzzle.puzzle.split("").map(function (digit) {
      return digit !== "0";
    });
    state.values = puzzle.puzzle.split("").map(function (digit) {
      return digit === "0" ? "" : digit;
    });
    state.selectedIndex = state.given.findIndex(function (isGiven) {
      return !isGiven;
    });
    renderBoard();
  }

  function setCellValue(value) {
    if (state.selectedIndex === null || state.given[state.selectedIndex]) {
      return;
    }
    state.values[state.selectedIndex] = value;
    renderBoard();
  }

  function moveSelection(step) {
    if (state.selectedIndex === null) {
      state.selectedIndex = 0;
    } else {
      state.selectedIndex = (state.selectedIndex + step + 81) % 81;
    }
    renderBoard();
    cells[state.selectedIndex].focus();
  }

  function chooseNextPuzzle() {
    var nextIndex = Math.floor(Math.random() * PUZZLES.length);
    if (PUZZLES.length > 1 && nextIndex === state.puzzleIndex) {
      nextIndex = (nextIndex + 1) % PUZZLES.length;
    }
    loadPuzzle(nextIndex);
  }

  function createBoard() {
    for (var index = 0; index < 81; index += 1) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "cell";
      if (getColumn(index) === 2 || getColumn(index) === 5) {
        button.classList.add("cell--box-right");
      }
      if (getRow(index) === 2 || getRow(index) === 5) {
        button.classList.add("cell--box-bottom");
      }
      button.addEventListener("click", selectCell.bind(null, index));
      cells.push(button);
      boardElement.appendChild(button);
    }
  }

  function createNumberPad() {
    ["1", "2", "3", "4", "5", "6", "7", "8", "9"].forEach(function (digit) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "pad-button";
      button.textContent = digit;
      button.addEventListener("click", function () {
        setCellValue(digit);
      });
      numberPadElement.appendChild(button);
    });

    var clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "pad-button pad-button--clear";
    clearButton.textContent = "Clear";
    clearButton.addEventListener("click", function () {
      setCellValue("");
    });
    numberPadElement.appendChild(clearButton);
  }

  function handleKeyboard(event) {
    if (/^[1-9]$/.test(event.key)) {
      setCellValue(event.key);
      event.preventDefault();
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
      setCellValue("");
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowLeft") {
      moveSelection(-1);
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowRight") {
      moveSelection(1);
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowUp") {
      moveSelection(-9);
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowDown") {
      moveSelection(9);
      event.preventDefault();
    }
  }

  function init() {
    boardElement = document.getElementById("sudoku-board");
    numberPadElement = document.getElementById("number-pad");
    progressValueElement = document.getElementById("progress-value");
    selectedValueElement = document.getElementById("selected-value");
    difficultyBadgeElement = document.getElementById("difficulty-badge");
    puzzleCountElement = document.getElementById("puzzle-count");
    statusMessageElement = document.getElementById("status-message");

    createBoard();
    createNumberPad();

    document.getElementById("new-puzzle").addEventListener("click", chooseNextPuzzle);
    document.getElementById("reset-board").addEventListener("click", function () {
      loadPuzzle(state.puzzleIndex);
    });
    window.addEventListener("keydown", handleKeyboard);

    loadPuzzle(0);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
