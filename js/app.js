
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.("#090b16");
    tg.setBackgroundColor?.("#090b16");
  }

  const STORE = {
    balance: "runex_demo_balance_v1",
    daily: "runex_daily_case_v1"
  };

  let balance = Number(localStorage.getItem(STORE.balance));
  if (!Number.isFinite(balance) || balance < 0) balance = 1000;

  let diceNumber = 1;
  let mines = [];
  let minesActive = false;
  let minesStake = 0;
  let minesOpened = 0;
  let minesMultiplier = 1;
  let cowActive = false;
  let cowStake = 0;
  let cowMultiplier = 1;
  let cowCrashAt = 2;
  let cowInterval = null;
  let toastTimeout = null;

  const money = (n) => Math.max(0, n).toFixed(2).replace(/\.00$/, "");
  const saveBalance = () => {
    localStorage.setItem(STORE.balance, String(balance));
    renderBalance();
  };

  function renderBalance() {
    $("balance").textContent = money(balance);
    $("profile-balance").textContent = money(balance);
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
    el.className = "message" + (type ? " " + type : "");
  }

  function setPage(name) {
    const target = $("page-" + name);
    if (!target) return;

    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    target.classList.add("active");

    document.querySelectorAll(".nav-item").forEach((b) => {
      b.classList.toggle("active", b.dataset.page === name);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validStake(id) {
    const value = Number($(id).value);
    if (!Number.isFinite(value) || value <= 0) {
      toast("Введи ставку больше нуля");
      return null;
    }
    if (value > balance) {
      toast("Недостаточно демомонет");
      return null;
    }
    return Math.floor(value * 100) / 100;
  }

  function debit(stake) {
    balance = Math.round((balance - stake) * 100) / 100;
    saveBalance();
  }

  function credit(amount) {
    balance = Math.round((balance + amount) * 100) / 100;
    saveBalance();
  }

  document.addEventListener("click", (event) => {
    const pageButton = event.target.closest("[data-page]");
    const gameButton = event.target.closest("[data-game]");

    if (gameButton) {
      setPage(gameButton.dataset.game);
      return;
    }

    if (pageButton) {
      event.preventDefault();
      setPage(pageButton.dataset.page);
    }
  });

  // DICE
  document.querySelectorAll("[data-number]").forEach((button) => {
    button.addEventListener("click", () => {
      diceNumber = Number(button.dataset.number);
      document.querySelectorAll("[data-number]").forEach((b) => {
        b.classList.toggle("selected", b === button);
      });
    });
  });

  $("roll-dice").addEventListener("click", () => {
    const stake = validStake("dice-bet");
    if (stake === null) return;

    debit(stake);
    const rolled = Math.floor(Math.random() * 6) + 1;
    $("dice-result").textContent = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][rolled - 1];

    if (rolled === diceNumber) {
      const prize = stake * 5.4;
      credit(prize);
      message("dice-message", `Угадал! Выпало ${rolled}. Начислено ${money(prize)} R.`, "success");
    } else {
      message("dice-message", `Выпало ${rolled}. Не угадал, попробуй ещё.`, "error");
    }
  });

  // MINES
  function updateMinesStats() {
    $("mines-count").textContent = String(minesOpened);
    $("mines-multiplier").textContent = "x" + minesMultiplier.toFixed(2);
  }

  function finishMines(won, text) {
    minesActive = false;
    $("start-mines").disabled = false;
    $("cashout-mines").disabled = true;
    document.querySelectorAll(".mine-cell").forEach((cell, i) => {
      if (mines[i] && !cell.classList.contains("safe")) {
        cell.textContent = "💣";
        cell.classList.add("boom");
      }
      cell.disabled = true;
    });
    message("mines-message", text, won ? "success" : "error");
  }

  function openMine(index, cell) {
    if (!minesActive || cell.disabled) return;

    cell.disabled = true;
    if (mines[index]) {
      cell.textContent = "💣";
      cell.classList.add("boom");
      finishMines(false, "Попалась мина! Ставка потеряна.");
      return;
    }

    cell.textContent = "💎";
    cell.classList.add("safe");
    minesOpened++;

    const mineCount = mines.filter(Boolean).length;
    const safeTotal = 25 - mineCount;
    minesMultiplier *= (25 - minesOpened + 1) / (safeTotal - minesOpened + 1);
    minesMultiplier *= 0.97;
    updateMinesStats();
    $("cashout-mines").disabled = false;

    if (minesOpened >= safeTotal) {
      const prize = minesStake * minesMultiplier;
      credit(prize);
      finishMines(true, `Все безопасные клетки найдены! Начислено ${money(prize)} R.`);
    }
  }

  $("start-mines").addEventListener("click", () => {
    if (minesActive) return;
    const stake = validStake("mines-bet");
    if (stake === null) return;

    const mineCount = Number($("mine-count").value);
    mines = Array(25).fill(false);
    let placed = 0;
    while (placed < mineCount) {
      const i = Math.floor(Math.random() * 25);
      if (!mines[i]) {
        mines[i] = true;
        placed++;
      }
    }

    debit(stake);
    minesStake = stake;
    minesOpened = 0;
    minesMultiplier = 1;
    minesActive = true;
    $("start-mines").disabled = true;
    $("cashout-mines").disabled = true;
    $("mines-grid").innerHTML = "";

    for (let i = 0; i < 25; i++) {
      const cell = document.createElement("button");
      cell.className = "mine-cell";
      cell.type = "button";
      cell.setAttribute("aria-label", "Клетка " + (i + 1));
      cell.addEventListener("click", () => openMine(i, cell));
      $("mines-grid").appendChild(cell);
    }

    updateMinesStats();
    message("mines-message", "Игра началась. Открывай клетки!");
  });

  $("cashout-mines").addEventListener("click", () => {
    if (!minesActive || minesOpened === 0) {
      toast("Сначала открой безопасную клетку");
      return;
    }

    const prize = minesStake * minesMultiplier;
    credit(prize);
    finishMines(true, `Ты забрал ${money(prize)} R!`);
  });

  // UPGRADE
  const risks = {
    low: { chance: 75, multiplier: 1.25 },
    medium: { chance: 50, multiplier: 1.90 },
    high: { chance: 25, multiplier: 3.70 }
  };

  function updateUpgradePreview() {
    const risk = risks[$("upgrade-risk").value];
    const stake = Math.max(0, Number($("upgrade-bet").value) || 0);
    $("upgrade-chance").textContent = risk.chance + "%";
    $("upgrade-prize").textContent = money(stake * risk.multiplier) + " R";
    $("upgrade-chance-bar").style.width = risk.chance + "%";
  }

  $("upgrade-risk").addEventListener("change", updateUpgradePreview);
  $("upgrade-bet").addEventListener("input", updateUpgradePreview);

  $("run-upgrade").addEventListener("click", () => {
    const stake = validStake("upgrade-bet");
    if (stake === null) return;

    const risk = risks[$("upgrade-risk").value];
    debit(stake);

    if (Math.random() * 100 < risk.chance) {
      const prize = stake * risk.multiplier;
      credit(prize);
      message("upgrade-message", `Успех! Начислено ${money(prize)} R.`, "success");
    } else {
      message("upgrade-message", "Не получилось. Ставка потеряна.", "error");
    }
  });

  // COW ROCKET
  function stopCow() {
    clearInterval(cowInterval);
    cowInterval = null;
    cowActive = false;
    $("cow-start").disabled = false;
    $("cow-cashout").disabled = true;
  }

  function cashoutCow() {
    if (!cowActive) return;
    const prize = cowStake * cowMultiplier;
    stopCow();
    credit(prize);
    $("cow-character").textContent = "🐮✨";
    message("cow-message", `Успешный полёт! Ты забрал ${money(prize)} R.`, "success");
  }

  $("cow-start").addEventListener("click", () => {
    if (cowActive) return;
    const stake = validStake("cow-bet");
    if (stake === null) return;

    debit(stake);
    cowStake = stake;
    cowMultiplier = 1;
    cowCrashAt = 1.15 + Math.random() * 3.35;
    cowActive = true;

    $("cow-start").disabled = true;
    $("cow-cashout").disabled = false;
    $("cow-character").textContent = "🐮🚀";
    $("cow-multiplier").textContent = "x1.00";
    $("cow-progress").style.width = "0%";
    message("cow-message", "Полетели! Забирай выигрыш до остановки.");

    const started = Date.now();
    cowInterval = setInterval(() => {
      const elapsed = (Date.now() - started) / 1000;
      cowMultiplier = Math.exp(elapsed * 0.38);
      $("cow-multiplier").textContent = "x" + cowMultiplier.toFixed(2);
      $("cow-progress").style.width = Math.min(100, elapsed * 15) + "%";
      $("cow-character").style.transform = `translateY(-${Math.min(35, elapsed * 5)}px)`;

      if (cowMultiplier >= cowCrashAt) {
        stopCow();
        $("cow-character").textContent = "💥";
        message("cow-message", `Коровка улетела на x${cowCrashAt.toFixed(2)}. Ставка потеряна.`, "error");
      }
    }, 100);
  });

  $("cow-cashout").addEventListener("click", cashoutCow);

  // DAILY CASE: one opening every 24 hours in this browser
  const DAY = 24 * 60 * 60 * 1000;

  function updateDailyCase() {
    const last = Number(localStorage.getItem(STORE.daily) || 0);
    const remaining = DAY - (Date.now() - last);
    const button = $("open-daily");
    const timer = $("daily-timer");

    if (remaining <= 0) {
      button.disabled = false;
      button.textContent = "Открыть";
      timer.textContent = "Можно открыть";
      return;
    }

    button.disabled = true;
    button.textContent = "Закрыт";
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    timer.textContent = `Следующий через ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  $("open-daily").addEventListener("click", () => {
    const last = Number(localStorage.getItem(STORE.daily) || 0);
    if (Date.now() - last < DAY) {
      updateDailyCase();
      toast("Ежедневный кейс ещё закрыт");
      return;
    }

    const reward = [10, 20, 35, 50, 75, 100][Math.floor(Math.random() * 6)];
    localStorage.setItem(STORE.daily, String(Date.now()));
    credit(reward);
    updateDailyCase();
    toast(`🎁 Ты получил ${reward} демомонет!`);
  });

  // PROFILE
  $("reset-balance").addEventListener("click", () => {
    if (!window.confirm("Сбросить демобаланс до 1000 R?")) return;
    balance = 1000;
    saveBalance();
    toast("Демобаланс сброшен");
  });

  const user = tg?.initDataUnsafe?.user;
  if (user) {
    $("profile-name").textContent =
      [user.first_name, user.last_name].filter(Boolean).join(" ") || "Игрок RUNEX";
  }

  renderBalance();
  updateUpgradePreview();
  updateDailyCase();
  setInterval(updateDailyCase, 1000);
})();

