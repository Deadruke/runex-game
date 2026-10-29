
(() => {
  "use strict";

  const START_BALANCE = 1000;
  const MAX_BET = 1000;

  let balance = START_BALANCE;
  let selectedGame = "dice";
  let selectedChoice = "high";
  const activity = [];

  const $ = (id) => document.getElementById(id);

  const games = {
    dice: {
      title: "Dice",
      description: "Predict whether the demo roll will be high or low."
    },
    mines: {
      title: "Mines",
      description: "Explore a demo grid. Every round is for virtual coins only."
    },
    upgrade: {
      title: "Upgrade",
      description: "Try a virtual upgrade challenge with a random outcome."
    }
  };

  function formatNumber(number) {
    return Math.floor(number).toLocaleString("en-US");
  }

  function renderBalance() {
    $("balance").textContent = formatNumber(balance);
  }

  function renderActivity() {
    const list = $("activityList");

    if (!activity.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span>◷</span>
          <p>Your demo activity will appear here.</p>
        </div>`;
      return;
    }

    list.replaceChildren();

    activity.slice(0, 8).forEach((item) => {
      const row = document.createElement("div");
      row.className = "activity-item";

      const details = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = item.title;

      const time = document.createElement("small");
      time.textContent = item.time;

      details.append(name, time);

      const amount = document.createElement("span");
      amount.className =
        "activity-value " + (item.delta >= 0 ? "positive" : "negative");

      amount.textContent =
        (item.delta >= 0 ? "+" : "") + formatNumber(item.delta) + " RUX";

      row.append(details, amount);
      list.append(row);
    });
  }

  function addActivity(title, delta) {
    activity.unshift({
      title,
      delta,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    });

    renderActivity();
  }

  function openGame(gameName) {
    if (!games[gameName]) return;

    selectedGame = gameName;
    $("gameTitle").textContent = games[gameName].title;
    $("gameDescription").textContent = games[gameName].description;
    $("gamePanel").hidden = false;

    $("choiceRow").hidden = gameName !== "dice";
    $("gameResult").className = "game-result";
    $("gameResult").textContent =
      "Demo coins only. No deposits or withdrawals.";

    $("gamePanel").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function setResult(message, type = "") {
    const result = $("gameResult");
    result.textContent = message;
    result.className = "game-result" + (type ? " " + type : "");
  }

  function playDemo() {
    const amount = Number($("demoBet").value);

    if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_BET) {
      setResult("Enter a whole number between 1 and 1,000 RUX.");
      return;
    }

    if (amount > balance) {
      setResult("Not enough demo coins. Reset your balance to practise again.");
      return;
    }

    balance -= amount;

    let won = false;
    let payout = 0;
    let description = "";

    if (selectedGame === "dice") {
      const roll = Math.floor(Math.random() * 100) + 1;
      won = selectedChoice === "high" ? roll > 50 : roll <= 50;

      if (won) {
        payout = amount * 2;
        balance += payout;
      }

      description = `Dice rolled ${roll}. ${selectedChoice.toUpperCase()} prediction.`;
    } else if (selectedGame === "mines") {
      won = Math.random() < 0.5;

      if (won) {
        payout = amount * 2;
        balance += payout;
      }

      description = won
        ? "Safe tile! Demo round won."
        : "Mine found! Demo round lost.";
    } else {
      won = Math.random() < 0.35;

      if (won) {
        payout = Math.floor(amount * 2);
        balance += payout;
      }

      description = won
        ? "Upgrade successful in the demo."
        : "Upgrade did not succeed this round.";
    }

    const delta = won ? amount : -amount;

    renderBalance();
    addActivity(games[selectedGame].title, delta);

    if (won) {
      setResult(
        `${description} Net result: +${formatNumber(amount)} RUX.`,
        "success"
      );
    } else {
      setResult(
        `${description} Net result: -${formatNumber(amount)} RUX.`,
        "failure"
      );
    }
  }

  document.querySelectorAll("[data-game]").forEach((button) => {
    button.addEventListener("click", () => {
      openGame(button.dataset.game);
    });
  });

  document.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedChoice = button.dataset.choice;

      document.querySelectorAll("[data-choice]").forEach((item) => {
        item.classList.toggle("selected", item === button);
      });
    });
  });

  $("playButton").addEventListener("click", playDemo);

  $("closeGame").addEventListener("click", () => {
    $("gamePanel").hidden = true;
  });

  $("resetBalance").addEventListener("click", () => {
    balance = START_BALANCE;
    renderBalance();
    setResult("Demo balance reset to 1,000 RUX.");
  });

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;

      document.querySelectorAll("[data-tab]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });

      if (tab === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      if (tab === "games") {
        document.querySelector(".games-grid").scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }

      if (tab === "activity") {
        $("activityList").scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }

      if (tab === "profile") {
        $("profileButton").scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

        setResult(
          "RUNEX demo profile. Session coins: " +
          formatNumber(balance) + " RUX."
        );
        $("gameTitle").textContent = "Your profile";
        $("gameDescription").textContent =
          "This is a local demo profile. Account syncing will be added later.";
        $("choiceRow").hidden = true;
        $("gamePanel").hidden = false;
      }
    });
  });

  const tg = window.Telegram?.WebApp;

  if (tg) {
    tg.ready();
    tg.expand();

    const user = tg.initDataUnsafe?.user;

    if (user) {
      $("avatar").textContent =
        (user.first_name || "R").trim().charAt(0).toUpperCase() || "R";
    }
  }

  renderBalance();
  renderActivity();
})();
