
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const tg = window.Telegram?.WebApp;

  if (tg) {
    tg.ready();
    tg.expand();
    try {
      tg.setHeaderColor("#171a2e");
      tg.setBackgroundColor("#171a2e");
    } catch (_) {}
  }

  // Демонстрационный баланс. Не является реальным денежным счётом.
  let balance = Number(localStorage.getItem("runex_demo_balance"));
  if (!Number.isFinite(balance) || balance < 0) balance = 1000;
  balance = Math.floor(balance);

  let selectedDice = 1;
  let mines = null;
  let cow = null;
  let toastTimeout = null;
  let dailyReadyAt = Number(localStorage.getItem("runex_daily_ready")) || 0;
  let dailyTimerInterval = null;

  function format(n) {
    return Math.floor(n).toLocaleString("ru-RU");
  }

  function saveBalance() {
    localStorage.setItem("runex_demo_balance", String(balance));
    $("balance").textContent = format(balance);
  }

  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.classList.remove("show"), 2400);
  }

  function message(id, text, type = "") {
    const el = $(id);
    el.textContent = text;
    el.className = "result-text" + (type ? " " + type : "");
  }

  function getBet(id) {
    const input = $(id);
    const bet = Number(input.value);
    if (!Number.isFinite(bet) || !Number.isInteger(bet) || bet < 1) {
      toast("Введи целую ставку от 1 RUX.");
      input.focus();
      return null;
    }
    if (bet > balance) {
      toast("Недостаточно виртуальных RUX.");
      return null;
    }
    return bet;
  }

  function changeBalance(amount) {
    balance = Math.max(0, Math.floor(balance + amount));
    saveBalance();
  }

  // Навигация
  function showPage(name) {
    const page = $("page-" + name);
    if (!page) return;

    document.querySelectorAll(".page").forEach((el) => {
      el.classList.toggle("active", el === page);
    });

    document.querySelectorAll(".nav-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.page === name);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });

  document.querySelectorAll("[data-game]").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.game));
  });

  // DICE
  $("dice-options").addEventListener("click", (event) => {
    const button = event.target.closest("[data-number]");
    if (!button) return;

    selectedDice = Number(button.dataset.number);
    document.querySelectorAll(".number-btn").forEach((el) => {
      el.classList.toggle("selected", el === button);
    });
  });

  $("roll-dice").addEventListener("click", () => {
    const bet = getBet("dice-bet");
    if (bet === null) return;

    changeBalance(-bet);
    const rollButton = $("roll-dice");
    rollButton.disabled = true;
    $("dice-result").textContent = "🎲";
    message("dice-message", "Кубик брошен...");

    setTimeout(() => {
      const result = Math.floor(Math.random() * 6) + 1;
      $("dice-result").textContent =
        ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][result - 1];

      if (result === selectedDice) {
        const prize = bet * 5;
        changeBalance(prize);
        message("dice-message", `Угадал! Выпало ${result}. Возвращено ${format(prize)} RUX.`, "success");
      } else {
        message("dice-message", `Выпало ${result}. Ставка потеряна. Попробуй ещё раз.`, "error");
      }
      rollButton.disabled = false;
    }, 650);
  });

  // MINES
  function makeMinesGrid() {
    const grid = $("mines-grid");
    grid.innerHTML = "";
    for (let i = 0; i < 25; i++) {
      const button = document.createElement("button");
      button.className = "mine-cell";
      button.type = "button";
      button.dataset.cell = String(i);
      button.textContent = "✦";
      button.setAttribute("aria-label", `Клетка ${i + 1}`);
      button.addEventListener("click", () => openMineCell(i));
      grid.appendChild(button);
    }
  }

  function renderMines() {
    if (!mines) return;
    $("mines-multiplier").textContent = "x" + mines.multiplier.toFixed(2);
    $("mines-count").textContent = String(mines.opened.size);

    document.querySelectorAll(".mine-cell").forEach((button) => {
      const index = Number(button.dataset.cell);
      if (mines.opened.has(index) || mines.finished) {
        button.disabled = true;
      }
      if (mines.opened.has(index)) {
        button.textContent = "💎";
        button.classList.add("open-gem");
      }
      if (mines.finished && mines.mineSet.has(index)) {
        button.textContent = "💣";
        button.classList.add("open-mine");
      }
    });
  }

  function finishMines(cashedOut) {
    if (!mines || mines.finished) return;
    mines.finished = true;

    $("start-mines").classList.remove("hidden");
    $("cashout-mines").classList.add("hidden");
    $("mine-count").disabled = false;
    $("mines-bet").disabled = false;

    if (cashedOut) {
      const payout = Math.floor(mines.bet * mines.multiplier);
      changeBalance(payout);
      message("mines-message", `Ты забрал ${format(payout)} RUX при x${mines.multiplier.toFixed(2)}.`, "success");
    } else {
      message("mines-message", "Мина! Ставка потеряна. Попробуй снова.", "error");
    }
    renderMines();
  }

  function openMineCell(index) {
    if (!mines || mines.finished || mines.opened.has(index)) return;

    if (mines.mineSet.has(index)) {
      finishMines(false);
      return;
    }

    mines.opened.add(index);
    const safe = 25 - mines.mineSet.size;
    const step = (25 - mines.mineSet.size) / (safe - mines.opened.size + 1);
    mines.multiplier *= Math.max(1.05, step * 0.94);
    renderMines();

    if (mines.opened.size >= safe) {
      finishMines(true);
    } else {
      message("mines-message", "Кристалл найден! Можешь продолжить или забрать выигрыш.", "success");
    }
  }

  $("start-mines").addEventListener("click", () => {
    if (mines && !mines.finished) return;

    const bet = getBet("mines-bet");
    if (bet === null) return;

    const mineCount = Number($("mine-count").value);
    changeBalance(-bet);

    const mineSet = new Set();
    while (mineSet.size < mineCount) {
      mineSet.add(Math.floor(Math.random() * 25));
    }

    mines = {
      bet,
      mineSet,
      opened: new Set(),
      multiplier: 1,
      finished: false
    };

    $("start-mines").classList.add("hidden");
    $("cashout-mines").classList.remove("hidden");
    $("mine-count").disabled = true;
    $("mines-bet").disabled = true;
    makeMinesGrid();
    renderMines();
    message("mines-message", `Игра началась. На поле ${mineCount} мин.`);
  });

  $("cashout-mines").addEventListener("click", () => {
    if (mines && !mines.finished && mines.opened.size > 0) {
      finishMines(true);
    } else {
      toast("Сначала найди хотя бы один кристалл.");
    }
  });

  // UPGRADE
  function updateUpgradePreview() {
    const bet = Math.max(1, Math.floor(Number($("upgrade-bet").value) || 1));
    const risk = Number($("upgrade-risk").value);
    const chance = Math.min(95, 96 / risk);

    $("upgrade-stake").textContent = format(bet) + " RUX";
    $("upgrade-prize").textContent = format(bet * risk) + " RUX";
    $("upgrade-chance").textContent = chance.toFixed(1) + "%";
    $("upgrade-chance-bar").style.width = chance + "%";
  }

  $("upgrade-bet").addEventListener("input", updateUpgradePreview);
  $("upgrade-risk").addEventListener("change", updateUpgradePreview);

  $("run-upgrade").addEventListener("click", () => {
    const bet = getBet("upgrade-bet");
    if (bet === null) return;

    const risk = Number($("upgrade-risk").value);
    const chance = Math.min(95, 96 / risk);
    changeBalance(-bet);

    const button = $("run-upgrade");
    button.disabled = true;
    message("upgrade-message", "Проверяем результат...");

    setTimeout(() => {
      button.disabled = false;
      if (Math.random() * 100 < chance) {
        const payout = Math.floor(bet * risk);
        changeBalance(payout);
        message("upgrade-message", `Успех! Получено ${format(payout)} RUX.`, "success");
      } else {
        message("upgrade-message", "Не получилось улучшить предмет. Попробуй ещё раз.", "error");
      }
    }, 500);
  });

  // КОРОВКА-РАКЕТКА
  function stopCowTimer() {
    if (cow?.interval) clearInterval(cow.interval);
    if (cow?.crashTimeout) clearTimeout(cow.crashTimeout);
  }

  function finishCow(crashed) {
    if (!cow || !cow.active) return;

    cow.active = false;
    stopCowTimer();
    $("cow-start").classList.remove("hidden");
    $("cow-cashout").classList.add("hidden");
    $("cow-bet").disabled = false;

    if (crashed) {
      $("cow-character").textContent = "💥";
      $("cow-progress").style.width = "100%";
      message("cow-message", `Ракетка улетела на x${cow.multiplier.toFixed(2)}. Ставка потеряна.`, "error");
    } else {
      const payout = Math.floor(cow.bet * cow.multiplier);
      changeBalance(payout);
      $("cow-character").textContent = "🐮🚀";
      message("cow-message", `Успел забрать ${format(payout)} RUX при x${cow.multiplier.toFixed(2)}!`, "success");
    }
  }

  $("cow-start").addEventListener("click", () => {
    if (cow?.active) return;
    const bet = getBet("cow-bet");
    if (bet === null) return;

    changeBalance(-bet);
    cow = { bet, multiplier: 1, active: true, interval: null, crashTimeout: null };

    $("cow-start").classList.add("hidden");
    $("cow-cashout").classList.remove("hidden");
    $("cow-bet").disabled = true;
    $("cow-character").textContent = "🐮🚀";
    $("cow-progress").style.width = "0%";
    message("cow-message", "Полёт начался! Забери выигрыш вовремя.");

    // Демонстрационная аркадная механика.
    const crashAt = 1800 + Math.random() * 5200;
    const startAt = Date.now();

    cow.interval = setInterval(() => {
      if (!cow || !cow.active) return;
      const elapsed = Date.now() - startAt;
      cow.multiplier = 1 + elapsed / 2500;
      $("cow-multiplier").textContent = "x" + cow.multiplier.toFixed(2);
      $("cow-progress").style.width = Math.min(100, elapsed / crashAt * 100) + "%";
    }, 80);

    cow.crashTimeout = setTimeout(() => finishCow(true), crashAt);
  });

  $("cow-cashout").addEventListener("click", () => {
    if (cow?.active) finishCow(false);
  });

  // ЕЖЕДНЕВНЫЙ КЕЙС
  function updateDailyTimer() {
    const remaining = dailyReadyAt - Date.now();
    const button = $("open-daily");
    const label = $("daily-timer");

    if (remaining <= 0) {
      label.textContent = "Можно открыть сейчас";
      button.disabled = false;
      button.textContent = "Открыть";
      return;
    }

    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    label.textContent = `Следующий кейс через ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    button.disabled = true;
    button.textContent = "Ожидание";
  }

  $("open-daily").addEventListener("click", () => {
    if (Date.now() < dailyReadyAt) {
      toast("Ежедневный кейс пока недоступен.");
      return;
    }

    const reward = [25, 50, 75, 100, 150][Math.floor(Math.random() * 5)];
    changeBalance(reward);
    dailyReadyAt = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem("runex_daily_ready", String(dailyReadyAt));
    updateDailyTimer();
    toast(`Ты получил ${reward} виртуальных RUX!`);
  });

  // Инициализация
  saveBalance();
  makeMinesGrid();
  updateUpgradePreview();
  updateDailyTimer();
  dailyTimerInterval = setInterval(updateDailyTimer, 1000);
})();
