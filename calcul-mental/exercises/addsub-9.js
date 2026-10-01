/*
 * Additions et soustractions de 9, 19, 29, 39 (ou toute autre « famille » définie dans la config).
 * Clé : "45+19" ou "72-29".
 */
CalculMental.registerExercise({
  id: "addsub",
  label: "Ajouter/Soustraire 9, 19, 29, 39",
  icon: "➕➖",
  defaults: { families: [9, 19, 29, 39], max: 99 },

  generate: function (options, util) {
    var family = util.pick(options.families);
    var base;
    if (Math.random() < 0.5) {
      base = util.randInt(11, options.max - family);
      return { key: base + "+" + family, text: base + " + " + family, answer: base + family };
    }
    base = util.randInt(family + 1, options.max);
    return { key: base + "-" + family, text: base + " - " + family, answer: base - family };
  },

  fromKey: function (key) {
    var m = /^(\d+)([+-])(\d+)$/.exec(key);
    if (!m) return null;
    var a = Number(m[1]), b = Number(m[3]);
    return m[2] === "+"
      ? { text: a + " + " + b, answer: a + b }
      : { text: a + " - " + b, answer: a - b };
  }
});
