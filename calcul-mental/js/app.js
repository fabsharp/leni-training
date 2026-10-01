(function () {
  "use strict";

  var CM = window.CalculMental;
  var config = CM.config;
  var learning = new CM.Learning(config.learning);

  // ── Utilitaires partagés avec les exercices ────────────────────────────────
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function pickFrom(arr) { return arr[randInt(0, arr.length - 1)]; }
  CM.util = { randInt: randInt, pick: pickFrom };

  // ── Chargement des exercices déclarés dans exercises.config.js ─────────────
  var exercises = [];       // exercices actifs, dans l'ordre de la config
  var exercisesById = {};   // tous les exercices chargés (y compris désactivés, pour les stats)
  var categories = [];      // catégories de la config, avec leurs exercices actifs
  var categoriesById = {};
  var loadingEntry = null;
  var loadingCategory = null;

  CM.registerExercise = function (def) {
    if (!loadingEntry) throw new Error("Exercice « " + def.id + " » chargé hors de la config");
    if (!def.id || def.id.indexOf(":") !== -1) throw new Error("Identifiant d'exercice invalide : " + def.id);
    if (exercisesById[def.id]) throw new Error("Exercice « " + def.id + " » déclaré deux fois");
    var ex = Object.assign({}, def, {
      code: loadingEntry.code || "",
      options: Object.assign({}, def.defaults || {}, loadingEntry.options || {})
    });
    exercisesById[ex.id] = ex;
    if (loadingEntry.enabled !== false) {
      exercises.push(ex);
      loadingCategory.exercises.push(ex);
    }
  };

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Impossible de charger " + src)); };
      document.head.appendChild(s);
    });
  }

  // Chargement un par un pour savoir à quelle entrée de config appartient chaque exercice.
  function loadExercises() {
    var p = Promise.resolve();
    config.categories.forEach(function (catConfig) {
      var cat = { id: catConfig.id, label: catConfig.label, icon: catConfig.icon, exercises: [] };
      categories.push(cat);
      categoriesById[cat.id] = cat;
      catConfig.exercises.forEach(function (entry) {
        p = p.then(function () {
          loadingCategory = cat;
          loadingEntry = entry;
          return loadScript(entry.file);
        });
      });
    });
    return p.then(function () { loadingEntry = null; loadingCategory = null; });
  }

  // ── Stockage ───────────────────────────────────────────────────────────────
  var STORAGE_KEY = "calcul-mental:v2";
  var LEGACY_KEY = "calcul-mental:v1";

  function emptyState() {
    return { sessionSize: 20, stats: {}, challengeHistory: [] };
  }

  // v1 : clés "mult:3x7", "add:45+9", "sub:72-9" → v2 : "<idExercice>:<clé>"
  function migrateV1(old) {
    var st = emptyState();
    if (old.settings && old.settings.sessionSize) st.sessionSize = old.settings.sessionSize;
    st.challengeHistory = old.challengeHistory || [];
    Object.keys(old.stats || {}).forEach(function (key) {
      var newKey = key.replace(/^(add|sub):/, "addsub:");
      st.stats[newKey] = old.stats[key];
    });
    return st;
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign(emptyState(), JSON.parse(raw));
      var legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) return migrateV1(JSON.parse(legacy));
    } catch (e) { /* données illisibles : on repart de zéro */ }
    return emptyState();
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* stockage indisponible */ }
  }

  var state = loadState();

  // ── Écrans ─────────────────────────────────────────────────────────────────
  var screens = {
    home: document.getElementById("screen-home"),
    setup: document.getElementById("screen-setup"),
    session: document.getElementById("screen-session"),
    result: document.getElementById("screen-result"),
    stats: document.getElementById("screen-stats")
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle("hidden", k !== name);
    });
  }

  var calcDisplay = document.getElementById("calc-display");
  var answerDisplay = document.getElementById("answer-display");
  var feedback = document.getElementById("feedback");
  var sessionInfo = document.getElementById("session-info");

  var messages = ["Bravo !", "Super !", "Génial !", "Trop fort !", "Continue !"];

  // Un « mode » est l'id d'un exercice, "cat:<id>" (mélange d'une catégorie),
  // "mixed" (tous les exercices) ou "review" (points faibles).
  function modeLabel(mode) {
    if (mode === "mixed") return "Mélange";
    if (mode === "review") return "Révision des points faibles";
    if (mode.indexOf("cat:") === 0) return categoriesById[mode.slice(4)].label + " — mélange";
    return exercisesById[mode] ? exerciseLabel(exercisesById[mode]) : "";
  }

  function exerciseLabel(ex) {
    return (ex.code ? ex.code + " · " : "") + ex.label;
  }

  function exercisesForMode(mode) {
    if (mode.indexOf("cat:") === 0) return categoriesById[mode.slice(4)].exercises;
    return exercisesById[mode] ? [exercisesById[mode]] : exercises;
  }

  function menuButton(className, text, mode, code) {
    var btn = document.createElement("button");
    btn.className = className;
    if (code) {
      var badge = document.createElement("span");
      badge.className = "code";
      badge.textContent = code;
      btn.appendChild(badge);
    }
    btn.appendChild(document.createTextNode(text));
    btn.addEventListener("click", function () { openSetup("practice", mode); });
    return btn;
  }

  function buildHomeMenu() {
    var box = document.getElementById("home-categories");
    categories.forEach(function (cat) {
      if (!cat.exercises.length) return;
      var section = document.createElement("div");
      section.className = "category";
      var title = document.createElement("h3");
      title.textContent = cat.icon + " " + cat.label;
      var menu = document.createElement("div");
      menu.className = "menu";
      cat.exercises.forEach(function (ex) {
        menu.appendChild(ex.code
          ? menuButton("primary", ex.label, ex.id, ex.code)
          : menuButton("primary", ex.icon + " " + ex.label, ex.id));
      });
      if (cat.exercises.length > 1) menu.appendChild(menuButton("primary", "🎲 Mélange", "cat:" + cat.id));
      section.appendChild(title);
      section.appendChild(menu);
      box.appendChild(section);
    });
  }

  function buildSetupSizes() {
    var box = document.getElementById("setup-sizes");
    config.sessionSizes.forEach(function (n) {
      var btn = document.createElement("button");
      btn.setAttribute("data-size", n);
      btn.textContent = n + " calculs";
      box.appendChild(btn);
    });
  }

  // ── Séance ─────────────────────────────────────────────────────────────────
  var session = null;
  var pendingSession = null;

  function openSetup(type, mode) {
    if (mode === "review" && !learning.weakFacts(state.stats, exercises.map(function (e) { return e.id; })).length) {
      alert("Pas encore de point faible à réviser : entraîne-toi d'abord !");
      return;
    }
    pendingSession = { type: type, mode: mode };
    var minutes = Math.round(config.challengeSeconds / 6) / 10;
    document.getElementById("setup-title").textContent =
      (type === "challenge" ? "Défi (" + minutes + " min) — " : "") + "Combien de calculs veux-tu faire ?";
    showScreen("setup");
  }

  function startSession(type, mode, size) {
    var list = learning.buildSession(exercisesForMode(mode), state.stats, size, { reviewOnly: mode === "review" });
    if (!list.length) return;
    session = {
      type: type,
      mode: mode,
      list: list,
      index: 0,
      correctCount: 0,
      answeredCount: 0,
      totalTimeMs: 0,
      current: null,
      questionStartTs: 0,
      answerStr: "",
      deadline: null,
      timerHandle: null
    };
    showScreen("session");
    if (type === "challenge") {
      session.deadline = Date.now() + config.challengeSeconds * 1000;
      session.timerHandle = setInterval(tickChallengeTimer, 250);
    }
    loadQuestion();
  }

  function tickChallengeTimer() {
    if (!session || session.type !== "challenge") return;
    var remaining = session.deadline - Date.now();
    if (remaining <= 0) {
      finishSession();
      return;
    }
    updateSessionInfo(remaining);
  }

  function updateSessionInfo(remainingMs) {
    if (!session) { sessionInfo.textContent = ""; return; }
    var progress = "Question " + (session.index + 1) + "/" + session.list.length;
    if (session.type === "challenge") {
      var s = Math.max(0, Math.ceil((remainingMs != null ? remainingMs : session.deadline - Date.now()) / 1000));
      var mm = String(Math.floor(s / 60)).padStart(2, "0");
      var ss = String(s % 60).padStart(2, "0");
      sessionInfo.innerHTML = progress + '<div class="timer">' + mm + ":" + ss + "</div>";
    } else {
      sessionInfo.innerHTML = modeLabel(session.mode) + '<div class="progress">' + progress + "</div>";
    }
  }

  function loadQuestion() {
    session.current = session.list[session.index];
    session.answerStr = "";
    session.questionStartTs = Date.now();
    render();
  }

  function render() {
    calcDisplay.className = "calc-display";
    var text = session.current.text;
    calcDisplay.textContent = text.indexOf("?") === -1 ? text + " = ?" : text;
    answerDisplay.textContent = session.answerStr || " ";
    feedback.textContent = " ";
    feedback.className = "feedback";
    updateSessionInfo();
  }

  function appendDigit(d) {
    if (!session || session.answerStr.length >= 4) return;
    session.answerStr += d;
    answerDisplay.textContent = session.answerStr;
  }

  function eraseDigit() {
    if (!session) return;
    session.answerStr = session.answerStr.slice(0, -1);
    answerDisplay.textContent = session.answerStr || " ";
  }

  function submitAnswer() {
    if (!session || session.answerStr === "") return;
    var value = Number(session.answerStr);
    var elapsed = Date.now() - session.questionStartTs;
    var correct = value === session.current.answer;

    learning.record(state.stats, session.current.key, correct, elapsed);
    saveState();
    if (!correct) learning.scheduleRetry(session.list, session.index, session.current);

    calcDisplay.classList.add(correct ? "flash-correct" : "flash-wrong");
    feedback.className = "feedback " + (correct ? "correct" : "wrong");
    feedback.textContent = correct ? pickFrom(messages) : ("Réponse : " + session.current.answer);

    session.answeredCount++;
    session.totalTimeMs += elapsed;
    if (correct) session.correctCount++;
    session.index++;

    setTimeout(function () {
      if (!session) return;
      if (session.index >= session.list.length) {
        finishSession();
      } else {
        loadQuestion();
      }
    }, correct ? 500 : 1100);
  }

  function finishSession() {
    if (session.timerHandle) clearInterval(session.timerHandle);
    var s = session;
    session = null;
    var avg = s.answeredCount ? Math.round(s.totalTimeMs / s.answeredCount / 100) / 10 : 0;
    if (s.type === "challenge") {
      state.challengeHistory.push({
        date: new Date().toISOString(),
        score: s.correctCount,
        total: s.answeredCount,
        avgTimeMs: s.answeredCount ? Math.round(s.totalTimeMs / s.answeredCount) : 0
      });
      saveState();
    }
    document.getElementById("result-title").textContent = s.type === "challenge"
      ? "⏱️ Résultat du défi"
      : "✅ Séance terminée — " + modeLabel(s.mode);
    document.getElementById("result-score").textContent = s.correctCount + " / " + s.answeredCount;
    document.getElementById("result-time").textContent = "Temps moyen par calcul : " + avg + " s";
    document.getElementById("result-errors").textContent = (s.answeredCount - s.correctCount) + " erreur(s)";
    document.getElementById("btn-result-replay").onclick = function () { openSetup(s.type, s.mode); };
    showScreen("result");
  }

  // ── Statistiques ───────────────────────────────────────────────────────────
  function renderStatsScreen() {
    var body = document.getElementById("stats-body");
    var empty = document.getElementById("stats-empty");
    var weak = learning.weakFacts(state.stats, exercises.map(function (e) { return e.id; }));
    body.innerHTML = "";
    empty.classList.toggle("hidden", weak.length > 0);
    weak.forEach(function (f) {
      var item = learning.itemFromKey(exercisesById, f.key);
      if (!item) return;
      var s = f.stat;
      var tr = document.createElement("tr");
      tr.innerHTML = "<td>" + item.text + "</td>" +
        "<td>" + s.attempts + "</td>" +
        "<td>" + s.errors + " (" + Math.round(s.errors / s.attempts * 100) + "%)</td>" +
        "<td>" + (s.timeEma / 1000).toFixed(1) + " s</td>" +
        "<td>" + f.reasons.join(", ") + "</td>";
      body.appendChild(tr);
    });
  }

  // ── Événements ─────────────────────────────────────────────────────────────
  function bindEvents() {
    document.getElementById("btn-challenge").addEventListener("click", function () { openSetup("challenge", "mixed"); });
    document.getElementById("btn-stats").addEventListener("click", function () {
      renderStatsScreen();
      showScreen("stats");
    });
    document.getElementById("btn-reset").addEventListener("click", function () {
      if (confirm("Effacer toutes les statistiques de Léni ?")) {
        state = emptyState();
        saveState();
        alert("Statistiques réinitialisées.");
      }
    });
    document.getElementById("btn-stats-home").addEventListener("click", function () { showScreen("home"); });
    document.getElementById("btn-review-worst").addEventListener("click", function () { openSetup("practice", "review"); });
    document.getElementById("btn-result-home").addEventListener("click", function () { showScreen("home"); });

    document.getElementById("setup-sizes").addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-size]");
      if (!btn || !pendingSession) return;
      var size = Number(btn.getAttribute("data-size"));
      state.sessionSize = size;
      saveState();
      startSession(pendingSession.type, pendingSession.mode, size);
      pendingSession = null;
    });
    document.getElementById("btn-setup-back").addEventListener("click", function () {
      pendingSession = null;
      showScreen("home");
    });

    document.getElementById("btn-back").addEventListener("click", function () {
      if (session && session.timerHandle) clearInterval(session.timerHandle);
      session = null;
      showScreen("home");
    });

    document.getElementById("keypad").addEventListener("click", function (e) {
      var btn = e.target.closest(".key");
      if (!btn || !session) return;
      var k = btn.getAttribute("data-key");
      if (k === "back") eraseDigit();
      else if (k === "ok") submitAnswer();
      else appendDigit(k);
    });

    document.addEventListener("keydown", function (e) {
      if (!session || screens.session.classList.contains("hidden")) return;
      if (e.key >= "0" && e.key <= "9") appendDigit(e.key);
      else if (e.key === "Backspace") eraseDigit();
      else if (e.key === "Enter") submitAnswer();
    });
  }

  loadExercises().then(function () {
    buildHomeMenu();
    buildSetupSizes();
    bindEvents();
    showScreen("home");
  }).catch(function (err) {
    document.getElementById("home-menu").textContent = "Erreur : " + err.message;
    showScreen("home");
  });
})();
