/*
 * Compléter à la centaine supérieure : 347 + ? = 400.
 * Clé : le nombre de départ ("347").
 */
CalculMental.registerExercise({
  id: "complement-centaine",
  label: "Compléter à la centaine supérieure",
  icon: "💯",
  defaults: { min: 1, max: 999 },

  generate: function (options, util) {
    var n;
    do { n = util.randInt(options.min, options.max); } while (n % 100 === 0);
    var q = this.fromKey(String(n));
    return { key: String(n), text: q.text, answer: q.answer };
  },

  fromKey: function (key) {
    var n = Number(key);
    var next = Math.ceil(n / 100) * 100;
    return { text: n + " + ? = " + next, answer: next - n };
  }
});
