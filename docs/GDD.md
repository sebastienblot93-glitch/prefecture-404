# Préfecture 404 — Proposition de développement

> *Géographie + déduction + Papers, Please.* Vous travaillez au Bureau national de vérification des territoires. Des communes françaises vous envoient des dossiers plus ou moins crédibles. Vérifiez, croisez, tamponnez.

Parties de 10 à 20 min, en solo ou en coop (2 ou 3 joueurs). Complexité technique faible à moyenne.

---

## 1. Piliers

1. **La vraie géographie, un règlement fictif assumé.** Les faits (départements, régions, fleuves, littoral, massifs, préfectures) sont réels et vérifiés. Les règles (décrets, fonds, pièces) sont inventées et présentées comme telles.
2. **Un verdict n'est jamais écrit à la main.** Le moteur de règles calcule chaque décision à partir de la base. Un dossier dont un élément n'est pas certain ne peut pas exister : le validateur le rejette.
3. **Le plaisir de repérer l'incohérence**, même quand tout le reste paraît normal. Le Mans « littorale », Reims « préfecture », Nantes « en Bretagne ».
4. **La communication sous pression** (coop) : les informations sont réparties entre les joueurs.

## 2. Boucle de jeu

```
Dossier arrive ─► lire les déclarations ─► vérifier (atlas / coéquipier)
      ▲                                              │
      │                                  signaler les anomalies (clic)
      │                                              │
Correction + explication ◄── tamponner ◄─────────────┘
```

Un dossier contient :

| Élément | Exemple | Rôle |
|---|---|---|
| Commune | Saint-Malo | identité (toujours exacte) |
| Objet de la demande | Fonds d'aide aux communes littorales | porte une **condition d'éligibilité** |
| Montant, pièces jointes | 60 000 €, attestation du maire | soumis aux **décrets du jour** |
| Déclarations | département, région, littoral, mer, cours d'eau, massif, chef-lieu | vraies ou fausses |
| Extrait de registre (copie jaune) | code INSEE 35288 | document complémentaire, peut être falsifié |
| Mot du demandeur | « Nos mouettes sont exigeantes. » | humour, fausses pistes |

## 3. Les quatre tampons et l'ordre d'examen

L'ordre est strict et affiché dans le règlement du joueur :

1. **Transférer** : la commune (réelle) n'est pas dans les régions de la section. Bonus si la bonne région de destination est choisie.
2. **Refuser** : demande irrecevable (rattachement à un autre département), condition d'éligibilité fausse, extrait de registre non conforme, ou décret du jour violé.
3. **Rectifier** : au moins une déclaration est fausse, mais elle ne conditionne pas la demande.
4. **Accepter** : tout est conforme.

**Justification.** Avant de tamponner, le joueur clique sur les lignes qu'il juge fausses (marque au crayon rouge). Bonne décision = 10 pts, + 5 si les signalements sont exacts. Une mauvaise décision coûte de la crédibilité. Après chaque dossier, les vraies anomalies sont surlignées et expliquées.

## 4. Rôles coopératifs

| Rôle | Voit | Ne voit pas | Page |
|---|---|---|---|
| Agent de guichet | dossiers, tampons | atlas (et règlement à 3) | `index.html` |
| Géographe | atlas thématique complet | dossiers | `atlas.html` |
| Inspecteur | règlement + décrets du jour | dossiers, atlas | `reglement.html?jour=N` ou `?graine=XXXXX` |

Aucun serveur n'est nécessaire : chaque rôle ouvre sa page sur son appareil, et les joueurs parlent (en vrai ou en visio). En mode infini, la **graine** garantit que l'inspecteur voit les mêmes décrets que le guichet.

L'atlas est volontairement organisé **par thème**. L'index des communes ne donne que le département, et il faut ouvrir la table des départements pour la région, celle des cours d'eau pour un fleuve, etc. Le géographe enquête au lieu de lire une réponse.

## 5. Progression

| Étape | Contenu | État |
|---|---|---|
| Semaine 1 — Bienvenue au bureau | département, région, littoral ; Section Ouest | ✅ 8 dossiers écrits |
| Semaine 2 — Les frontières se compliquent | fleuves, massifs, mers, préfectures, erreurs multiples, Corse 2A/2B ; Section Sud-Est | ✅ 8 dossiers écrits |
| Semaine 3 — La réforme administrative | décrets : seuil de montant, pièce obligatoire, objet suspendu ; registre falsifié ; Section Nord-Est | ✅ 8 dossiers écrits |
| Semaine 4 — Inspection générale | dossiers liés entre eux, mémoire collective | 🔜 voir §8 |
| Mode infini | générateur à graine, file d'attente qui s'accélère, mutation à Clipperton à 0 % | ✅ |

Carrière : stagiaire → agent territorial → responsable des trombones → chef de bureau → directeur du tampon national (points cumulés, stockés dans le navigateur).

## 6. Architecture

```
src/data/        référentiel (seule source de vérité)
  territoires.js   18 régions, 101 départements, 101 chefs-lieux (codes COG INSEE)
  communes.js      83 fiches communes : littoral, mer, cours d'eau, massif, notes pédagogiques
  geographie.js    cours d'eau, massifs, mers + régions qu'ils touchent
src/moteur/
  verite.js        évalue une déclaration : vrai / faux / indécidable
  regles.js        objets, pièces, articles, décrets, decider(), valider(), noter()
  generateur.js    fabrique un dossier à partir de faits certains, re-vérifié par decider()
  hasard.js        aléatoire à graine (même graine = même partie pour tous)
src/campagne/    journées écrites à la main + contexte du mode infini
src/ui/          interface (vanilla JS, aucune dépendance, aucun build)
tests/           node --test : données, moteur, 24 dossiers écrits, 3 000 dossiers générés
tools/           vérification officielle (geo.api.gouv.fr), fiche de relecture humaine
```

Choix techniques : HTML/CSS/JS sans framework ni étape de build, servi tel quel par GitHub Pages. Sons synthétisés en WebAudio (aucun fichier). Toute la logique est testable dans Node.

## 7. La cohérence des données (le vrai défi technique)

Voir [DONNEES.md](DONNEES.md). En résumé, trois verrous :

1. **Zones grises interdites.** Chaque fait est `vrai`, `faux` ou `null` (inconnu). Un fait inconnu ne peut apparaître dans aucun dossier. La fausseté d'un fleuve ou d'un massif n'est déduite que si la commune est dans une région que ce fleuve ou ce massif ne touche pas du tout.
2. **Vérification automatique** des codes, noms, départements et régions contre l'API officielle `geo.api.gouv.fr`, à chaque push et chaque lundi (fusions de communes).
3. **Double saisie + relecture.** Chefs-lieux saisis deux fois et croisés par les tests ; verdicts des dossiers écrits à la main croisés avec le moteur ; faits géographiques listés dans [RELECTURE.md](RELECTURE.md) pour un relecteur humain.

## 8. Feuille de route

**Lot 1 — Consolider le MVP (1 à 2 semaines)**
- Relecture humaine complète de `RELECTURE.md` ; passer en zone grise tout fait douteux.
- Tests de jeu avec 5 joueurs : chronométrer, ajuster `duree` et les pénalités.
- Erreurs plus crédibles dans le générateur : département voisin, région limitrophe, fleuve du même bassin (aujourd'hui l'erreur est souvent tirée au hasard dans toute la France).
- 6 dossiers supplémentaires pour atteindre 30.

**Lot 2 — Semaine 4 : dossiers liés**
- Un dossier peut citer un dossier antérieur (« conformément à la décision sur le dossier S4-2… »).
- Le joueur doit consulter son **registre des décisions** (historique tamponné) : valider trop vite un dossier A contamine le dossier C.
- Moteur : `decider()` reçoit l'historique ; les tests vérifient chaque chaîne A → B → C.

**Lot 3 — Contenu et personnalité**
- 150 à 300 communes, dont les DROM (Guadeloupe, Réunion…) ; rivières secondaires.
- Carte de France interactive dans l'atlas (SVG des départements, licence Etalab).
- Décorations de bureau débloquables, nouvelles répliques d'Agrafe, administrés récurrents.
- Classement quotidien : graine du jour partagée par tous, score publié.

**Lot 4 — Coop en réseau (optionnel)**
- Synchronisation temps réel (WebRTC ou petit serveur WebSocket) : l'inspecteur peut réellement **bloquer** un tampon avant validation.

## 9. Écrire un bon dossier

- Un dossier = **une idée**. « Reims n'est pas préfecture » ; « la Manche est aussi un département ».
- Le mot du demandeur peut induire en erreur, jamais mentir sur les données.
- Préférer les erreurs plausibles (Nantes en Bretagne, Ajaccio en 2B) aux erreurs absurdes, sauf pour faire rire (Brest veut rejoindre les Bouches-du-Rhône).
- Toujours renseigner `attendu`. Si le test casse, c'est soit le dossier, soit la base qui a tort : ne jamais « corriger » le test.
