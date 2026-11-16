# Préfecture 404 — consignes pour les agents

- Jeu statique en JavaScript vanilla (modules ES), sans dépendance ni build. Langue du code, des commentaires et des textes : français.
- `src/data/` est la seule source de vérité. Règle d'or : un fait incertain vaut `null` (zone grise), jamais une supposition.
- Ne jamais écrire un verdict à la main dans le code de jeu : il vient de `decider()` dans `src/moteur/regles.js`.
- Un dossier écrit à la main porte `attendu` ; si `tests/campagne.test.mjs` casse, corriger le dossier ou la donnée, jamais le test.
- Avant de livrer : `npm test`. Après une modification de `src/data/communes.js` : `node tools/fiche-relecture.mjs > docs/RELECTURE.md`.
- Mode en ligne : `server/salon.mjs` est l'arbitre ; une vue (`vuePour`) ne doit exposer que ce que le poste voit. Les postes sont testés dans `tests/salon.test.mjs`.
- `tools/verifier-officiel.mjs` nécessite Internet (geo.api.gouv.fr) ; il tourne en CI.
