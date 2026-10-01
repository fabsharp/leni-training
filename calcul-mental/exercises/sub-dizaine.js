/*
 * Soustraire un nombre inférieur à 9 avec changement de dizaine : 53 - 7, 40 - 3…
 * Le chiffre des unités du premier nombre est toujours plus petit que le nombre soustrait.
 * Clé : "53-7".
 */
CalculMental.registerExercise({
  id: "sub-dizaine",
  label: "Soustraire un nombre inférieur à 9 avec changement de dizaine",
  icon: "➖",
  defaults: { maxSub: 8, max: 99 },

  generate: function (options, util) {
    var b = util.randInt(1, options.maxSub);
    var tens = util.randInt(1, Math.floor(options.max / 10));
    var units = util.randInt(0, Math.min(b - 1, options.max - tens * 10));
    var a = tens * 10 + units;
    return { key: a + "-" + b, text: a + " - " + b, answer: a - b };
  },

  fromKey: function (key) {
    var parts = key.split("-");
    var a = Number(parts[0]), b = Number(parts[1]);
    return { text: a + " - " + b, answer: a - b };
  }
});
