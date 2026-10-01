/*
 * Algorithme d'apprentissage commun à tous les exercices.
 *
 * Il construit les séances en mélangeant :
 *   - des problèmes nouveaux (générés par les exercices, en privilégiant ceux jamais vus) ;
 *   - des révisions : les calculs ratés et ceux qui prennent le plus de temps.
 * Une erreur pendant la séance fait aussi revenir le calcul quelques questions plus tard.
 *
 * Chaque calcul est identifié par une clé "<idExercice>:<clé de l'exercice>" et suivi par :
 *   attempts, errors, totalTimeMs, lastSeen  — compteurs bruts (affichage)
 *   errEma  — taux d'erreur récent (moyenne mobile, 0..1) : une erreur ancienne s'efface
 *   timeEma — temps de réponse récent en ms (moyenne mobile sur les bonnes réponses)
 *   streak  — nombre de bonnes réponses consécutives
 */
(function (global) {
  "use strict";

  var CM = global.CalculMental = global.CalculMental || {};

  var DEFAULTS = {
    reviewShare: 0.4,     // part maximale d'une séance consacrée aux révisions
    errorWeight: 1,       // poids des erreurs dans la priorité de révision
    slowWeight: 0.6,      // poids de la lenteur dans la priorité de révision
    weakErrorRate: 0.2,   // au-dessus de ce taux d'erreur récent, le calcul est à revoir
    slowRatio: 1.3,       // au-delà de 1,3 × le temps médian de l'exercice, le calcul est « lent »
    minFactsForTiming: 5, // nombre de calculs connus nécessaire pour calculer un temps médian fiable
    masteredStreak: 3,    // bonnes réponses d'affilée pour considérer un calcul comme acquis
    emaAlpha: 0.4,        // réactivité des moyennes mobiles (plus grand = oublie plus vite le passé)
    retryGap: 3           // une erreur en séance est reposée environ 3 questions plus tard
  };

  function Learning(options) {
    this.opt = Object.assign({}, DEFAULTS, options || {});
  }

  function exerciseIdOf(key) {
    return key.slice(0, key.indexOf(":"));
  }

  function median(values) {
    if (!values.length) return 0;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // Complète une statistique enregistrée par une version précédente de l'application.
  Learning.prototype.normalize = function (s) {
    if (s.errEma == null) s.errEma = s.attempts ? s.errors / s.attempts : 0;
    if (s.timeEma == null) s.timeEma = s.attempts ? s.totalTimeMs / s.attempts : 0;
    if (s.streak == null) s.streak = 0;
    return s;
  };

  Learning.prototype.record = function (stats, key, correct, elapsedMs) {
    var s = stats[key] || (stats[key] = { attempts: 0, errors: 0, totalTimeMs: 0, lastSeen: 0 });
    this.normalize(s);
    var a = this.opt.emaAlpha;
    var miss = correct ? 0 : 1;
    s.errEma = s.attempts ? s.errEma * (1 - a) + miss * a : miss;
    // Le temps d'une mauvaise réponse ne dit pas grand-chose : on ne l'utilise que faute de mieux.
    if (correct || !s.timeEma) s.timeEma = s.timeEma ? s.timeEma * (1 - a) + elapsedMs * a : elapsedMs;
    s.attempts += 1;
    s.totalTimeMs += elapsedMs;
    s.lastSeen = Date.now();
    if (correct) {
      s.streak += 1;
    } else {
      s.errors += 1;
      s.streak = 0;
    }
  };

  /*
   * Analyse tous les calculs connus des exercices donnés et renvoie, triés par priorité décroissante :
   *   { key, stat, slowness, priority, weak, mastered, reasons: ["erreurs", "lent"] }
   * slowness = temps récent / temps médian des calculs du même exercice.
   */
  Learning.prototype.analyze = function (stats, exerciseIds) {
    var opt = this.opt;
    var self = this;
    var groups = {};
    Object.keys(stats).forEach(function (key) {
      var id = exerciseIdOf(key);
      if (exerciseIds && exerciseIds.indexOf(id) === -1) return;
      var s = self.normalize(stats[key]);
      if (!s.attempts) return;
      (groups[id] = groups[id] || []).push({ key: key, stat: s });
    });

    var out = [];
    Object.keys(groups).forEach(function (id) {
      var facts = groups[id];
      var ref = facts.length >= opt.minFactsForTiming
        ? median(facts.map(function (f) { return f.stat.timeEma; }))
        : 0;
      facts.forEach(function (f) {
        var s = f.stat;
        f.slowness = ref ? s.timeEma / ref : 1;
        var slowScore = Math.min(1, Math.max(0, f.slowness - 1));
        var daysAgo = (Date.now() - s.lastSeen) / 86400000;
        f.reasons = [];
        if (s.errEma >= opt.weakErrorRate) f.reasons.push("erreurs");
        if (f.slowness >= opt.slowRatio) f.reasons.push("lent");
        f.weak = f.reasons.length > 0;
        f.mastered = !f.weak && s.streak >= opt.masteredStreak;
        f.priority = opt.errorWeight * s.errEma + opt.slowWeight * slowScore +
          (f.weak ? 0.2 * Math.min(1, daysAgo / 7) : 0); // un point faible pas revu depuis longtemps remonte
        out.push(f);
      });
    });

    out.sort(function (a, b) { return b.priority - a.priority; });
    return out;
  };

  Learning.prototype.weakFacts = function (stats, exerciseIds) {
    return this.analyze(stats, exerciseIds).filter(function (f) { return f.weak; });
  };

  // Transforme une clé complète en question affichable, via l'exercice qui l'a créée.
  Learning.prototype.itemFromKey = function (exercisesById, key, source) {
    var ex = exercisesById[exerciseIdOf(key)];
    if (!ex) return null;
    var q = ex.fromKey(key.slice(key.indexOf(":") + 1), ex.options);
    return q ? { key: key, text: q.text, answer: q.answer, source: source } : null;
  };

  function weightedPick(candidates) {
    var total = 0;
    candidates.forEach(function (c) { total += c.priority + 0.05; });
    var r = Math.random() * total;
    for (var i = 0; i < candidates.length; i++) {
      r -= candidates[i].priority + 0.05;
      if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  /*
   * Construit une séance de `size` questions pour les exercices donnés.
   * options.reviewOnly : uniquement des révisions (renvoie [] s'il n'y a aucun point faible).
   */
  Learning.prototype.buildSession = function (exercises, stats, size, options) {
    var reviewOnly = !!(options && options.reviewOnly);
    var byId = {};
    exercises.forEach(function (ex) { byId[ex.id] = ex; });
    var ids = exercises.map(function (ex) { return ex.id; });
    var analysis = this.analyze(stats, ids);
    var known = {};
    analysis.forEach(function (f) { known[f.key] = f; });
    var weak = analysis.filter(function (f) { return f.weak; });
    if (reviewOnly && !weak.length) return [];
    // En révision seule, on complète avec les calculs les moins sûrs pour ne pas répéter toujours le même.
    var reviewPool = reviewOnly
      ? weak.concat(analysis.filter(function (f) { return !f.weak && !f.mastered; })).slice(0, Math.max(weak.length, 8))
      : weak;

    var items = [];
    var counts = {};
    var maxRepeat = Math.max(2, Math.ceil(size / 6));
    var maxReviewRepeat = reviewOnly ? Math.ceil(size / reviewPool.length) + 1 : 2;

    // 1. Révisions : tirage pondéré par la priorité (erreurs + lenteur).
    var nReview = reviewOnly ? size : Math.round(size * this.opt.reviewShare);
    while (items.length < nReview) {
      var pool = reviewPool.filter(function (f) { return (counts[f.key] || 0) < maxReviewRepeat; });
      if (!pool.length) break;
      var fact = weightedPick(pool);
      var item = this.itemFromKey(byId, fact.key, "review");
      counts[fact.key] = (counts[fact.key] || 0) + 1;
      if (item) items.push(item);
    }

    // 2. Nouveaux problèmes : on privilégie les calculs jamais vus, puis ceux pas encore acquis.
    while (items.length < size) {
      var fresh = this.generateFresh(exercises, known, counts, maxRepeat);
      counts[fresh.key] = (counts[fresh.key] || 0) + 1;
      items.push(fresh);
    }

    return spreadOut(shuffle(items));
  };

  Learning.prototype.generateFresh = function (exercises, known, counts, maxRepeat) {
    var fallback = null, notMastered = null;
    for (var i = 0; i < 12; i++) {
      var ex = exercises[Math.floor(Math.random() * exercises.length)];
      var q = ex.generate(ex.options, CM.util);
      var item = { key: ex.id + ":" + q.key, text: q.text, answer: q.answer, source: "new" };
      if ((counts[item.key] || 0) >= maxRepeat) {
        fallback = fallback || item;
        continue;
      }
      var f = known[item.key];
      if (!f) return item;
      if (!f.mastered && !notMastered) notMastered = item;
      fallback = fallback || item;
    }
    return notMastered || fallback;
  };

  /*
   * Après une erreur, replanifie le même calcul quelques questions plus loin
   * (à la place d'un problème nouveau, pour garder la longueur de la séance).
   */
  Learning.prototype.scheduleRetry = function (list, index, item) {
    for (var p = index + this.opt.retryGap; p < list.length; p++) {
      if (list[p].source !== "new") continue;
      if ((list[p - 1] && list[p - 1].key === item.key) || (list[p + 1] && list[p + 1].key === item.key)) continue;
      list[p] = { key: item.key, text: item.text, answer: item.answer, source: "retry" };
      return true;
    }
    return false;
  };

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // Évite qu'un même calcul soit posé deux fois de suite.
  function spreadOut(arr) {
    for (var i = 1; i < arr.length; i++) {
      if (arr[i].key !== arr[i - 1].key) continue;
      for (var j = 0; j < arr.length; j++) {
        if (j === i || j === i - 1 || arr[j].key === arr[i].key) continue;
        if ((arr[j - 1] && arr[j - 1].key === arr[i].key && j - 1 !== i) ||
            (arr[j + 1] && arr[j + 1].key === arr[i].key && j + 1 !== i)) continue;
        if ((arr[i - 1] && arr[i - 1].key === arr[j].key) || (arr[i + 1] && arr[i + 1].key === arr[j].key)) continue;
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        break;
      }
    }
    return arr;
  }

  CM.Learning = Learning;
})(window);
