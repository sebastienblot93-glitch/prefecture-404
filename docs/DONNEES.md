# Protocole de données vérifiées

Le jeu n'est amusant que s'il est juste : un joueur qui a raison contre le jeu ne revient pas. Ce document décrit comment chaque information est garantie.

## 1. Trois niveaux de certitude

| Statut d'un fait | Signification | Utilisation en jeu |
|---|---|---|
| `vrai` | listé explicitement sur la fiche | déclarations vraies, conditions remplies |
| `faux` | impossible avec certitude | déclarations fausses, conditions non remplies |
| `null` / absent | zone grise | **interdit** : le validateur rejette le dossier |

Règle d'or : **en cas de doute, `null`**. Une zone grise réduit le nombre de dossiers possibles ; une erreur dans la base fausse des parties.

### Comment le « faux » est établi

- **Département, région, chef-lieu** : comparaison directe avec la table officielle.
- **Littoral** : `false` saisi uniquement pour les communes nettement intérieures. Estuaires, rades, golfes et étangs restent en zone grise.
- **Mer bordante** : seulement si la commune est littorale *et* la mer est certaine (Calais, à la limite Manche / mer du Nord, reste en zone grise).
- **Cours d'eau** : « Toulouse est au bord de la Loire » est faux car la Loire ne touche aucune région d'Occitanie. Les listes de régions de `geographie.js` sont donc volontairement **larges** : une région en trop supprime des fausses déclarations possibles, mais n'en crée jamais une erronée. « Nevers est au bord de l'Allier » reste indécidable, l'Allier rejoignant la Loire tout près.
- **Massif** : même principe, plus `massif: false` pour les communes nettement hors montagne.

> Note : le « Fonds d'aide aux communes littorales » du jeu est fictif. Au sens du règlement du jeu, *littoral = bordé par la mer*. La loi Littoral réelle inclut aussi certains lacs (Annecy) et estuaires : c'est pourquoi le règlement affiché en jeu donne la définition.

## 2. Vérifications automatiques

| Contrôle | Outil | Quand |
|---|---|---|
| Codes et noms des 18 régions et 101 départements, département → région | `tools/verifier-officiel.mjs` contre `geo.api.gouv.fr` (COG INSEE) | chaque push + chaque lundi (CI) |
| Pour chaque commune : code INSEE existant, nom officiel, département, région | idem | idem |
| Code INSEE commençant par le département, noms et codes uniques, références valides | `tests/donnees.test.mjs` | chaque push |
| Chef-lieu : fiche commune ⇄ table `CHEFS_LIEUX` (deux saisies indépendantes) | `tests/donnees.test.mjs` | chaque push |
| Un fleuve déclaré VRAI pour une commune doit inclure sa région | `tests/donnees.test.mjs` | chaque push |
| 24 dossiers écrits : décidables et verdict moteur = verdict auteur | `tests/campagne.test.mjs` | chaque push |
| 3 000 dossiers générés : tous valides, les 4 verdicts représentés | `tests/generateur.test.mjs` | chaque push |

Lancer en local :

```bash
npm test                          # cohérence interne
node tools/verifier-officiel.mjs  # nécessite un accès Internet
```

## 3. Relecture humaine

Les faits géographiques (littoral, mer, cours d'eau, massif) n'ont pas d'API officielle simple. Ils sont listés dans [RELECTURE.md](RELECTURE.md), régénéré par :

```bash
node tools/fiche-relecture.mjs > docs/RELECTURE.md
```

Sources conseillées : IGN Géoportail (limites communales et trait de côte), SANDRE (cours d'eau), Wikipédia en recoupement seulement.

## 4. Ajouter une commune

1. Récupérer le code INSEE officiel (geo.api.gouv.fr ou INSEE).
2. Remplir la fiche dans `src/data/communes.js` : `null` pour tout ce qui n'est pas certain.
3. `npm test`, puis `node tools/verifier-officiel.mjs`.
4. Régénérer `RELECTURE.md` et faire relire la nouvelle ligne.

## 5. État actuel

- Régions, départements et 83 communes : **conformes au Code officiel géographique** (vérification geo.api.gouv.fr du 16/11/2026, aucune divergence). Chefs-lieux : double saisie concordante.
- Faits géographiques (littoral, mer, cours d'eau, massifs) : limités aux cas nets, relecture humaine à faire (RELECTURE.md).
