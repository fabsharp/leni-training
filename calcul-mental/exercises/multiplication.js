/*
 * Tables de multiplication.
 * Clé : "3x7" (le plus petit facteur d'abord, pour que 3 × 7 et 7 × 3 partagent les mêmes statistiques).
 */
CalculMental.registerExercise({
  id: "mult",
  label: "Toutes les tables",
  icon: "✖️",
  defaults: { tables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], maxFactor: 10 },

  generate: function (options, util) {
    var a = util.pick(options.tables);
    var b = util.randInt(1, options.maxFactor);
    var lo = Math.min(a, b), hi = Math.max(a, b);
    return { key: lo + "x" + hi, text: a + " × " + b, answer: a * b };
  },

  fromKey: function (key) {
    var parts = key.split("x");
    var a = Number(parts[0]), b = Number(parts[1]);
    // Réviser dans un sens ou dans l'autre
    if (Math.random() < 0.5) { var t = a; a = b; b = t; }
    return { text: a + " × " + b, answer: a * b };
  }
});
