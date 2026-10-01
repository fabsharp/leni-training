# Léni Training

Petites applications web d'entraînement scolaire, sans backend ni build — chaque
activité est un dossier autonome avec son propre `index.html`, publié via
GitHub Pages.

## Activités

- [`calcul-mental/`](calcul-mental/) — deux catégories, avec suivi des erreurs,
  chronométrage par calcul, et défis chronométrés :
  - tables de multiplication ;
  - calcul mental : C.M 1 ajouter/soustraire 9, 19, 29, 39 — C.M 2 soustraire un
    nombre inférieur à 9 avec changement de dizaine — C.M 3 compléter à la
    centaine supérieure.

  Organisation du code :
  - `exercises/` : un fichier par exercice ;
  - `exercises.config.js` : catégories, exercices actifs et leurs options (la marche
    à suivre pour en ajouter un est décrite en tête du fichier) ;
  - `js/learning.js` : algorithme d'apprentissage commun (problèmes nouveaux +
    révision des erreurs et des calculs les plus lents) ;
  - `js/app.js` : interface et sauvegarde.
