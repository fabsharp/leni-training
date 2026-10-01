/*
 * Configuration de l'application de calcul mental.
 *
 * ── Ajouter un exercice ─────────────────────────────────────────────────────
 * 1. Créer un fichier dans exercises/, par exemple exercises/doubles.js :
 *
 *      CalculMental.registerExercise({
 *        id: "doubles",              // identifiant unique, sans ":" — ne plus le changer ensuite
 *                                    // (il sert à retrouver les statistiques enregistrées)
 *        label: "Doubles",           // texte du bouton
 *        icon: "✌️",
 *        defaults: { max: 50 },      // options par défaut, modifiables ci-dessous
 *
 *        // Crée un nouveau problème.
 *        //   key    : identifie le calcul (même calcul = même clé), sans ":"
 *        //   text   : ce qui est affiché (sans le "= ?")
 *        //   answer : entier positif, 4 chiffres maximum (saisi au pavé numérique)
 *        generate: function (options, util) {
 *          var n = util.randInt(1, options.max);
 *          return { key: String(n), text: n + " + " + n, answer: 2 * n };
 *        },
 *
 *        // Recrée le calcul à partir de sa clé (utilisé pour les révisions).
 *        fromKey: function (key, options) {
 *          var n = Number(key);
 *          return { text: n + " + " + n, answer: 2 * n };
 *        }
 *      });
 *
 *    `util` fournit randInt(min, max) et pick(tableau).
 *
 * 2. L'ajouter dans la liste `exercises` de sa catégorie ci-dessous. Il apparaît alors
 *    sur l'écran d'accueil dans cette catégorie, dans le « Mélange » de la catégorie
 *    (dès qu'elle contient au moins 2 exercices), et dans le défi chronométré.
 *
 * `code` (facultatif) numérote le concept, par exemple "C.M 4" ; il s'affiche devant le nom.
 * Si le texte du calcul contient déjà un "?" (ex. "347 + ? = 400"), il est affiché tel quel ;
 * sinon " = ?" est ajouté à la fin.
 * Mettre `enabled: false` pour masquer un exercice sans perdre ses statistiques.
 * Une nouvelle catégorie s'ajoute de la même façon dans `categories`.
 */
CalculMental.config = {
  categories: [
    {
      id: "tables",
      label: "Tables de multiplication",
      icon: "✖️",
      exercises: [
        {
          file: "exercises/multiplication.js",
          options: { tables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }
        }
      ]
    },
    {
      id: "calcul",
      label: "Calcul mental",
      icon: "🧮",
      exercises: [
        {
          code: "C.M 1",
          file: "exercises/addsub-9.js",
          options: { families: [9, 19, 29, 39] }
        },
        {
          code: "C.M 2",
          file: "exercises/sub-dizaine.js",
          options: { maxSub: 8, max: 99 }
        },
        {
          code: "C.M 3",
          file: "exercises/complement-centaine.js",
          options: { min: 1, max: 999 }
        }
      ]
    }
  ],

  sessionSizes: [10, 15, 20, 30],
  challengeSeconds: 120,

  // Réglages de l'algorithme d'apprentissage (voir js/learning.js pour le détail).
  learning: {
    reviewShare: 0.4,   // jusqu'à 40 % de la séance pour revoir erreurs et calculs lents
    slowRatio: 1.3,     // « lent » = 30 % de temps de plus que la médiane de l'exercice
    retryGap: 3         // un calcul raté est reposé 3 questions plus tard
  }
};
