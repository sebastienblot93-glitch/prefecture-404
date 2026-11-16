# Fiche de relecture des faits géographiques

Générée par `node tools/fiche-relecture.mjs > docs/RELECTURE.md`. Ne pas modifier à la main.

Les faits administratifs (codes, noms, départements, régions) sont vérifiés automatiquement par `tools/verifier-officiel.mjs`. Les chefs-lieux sont en double saisie croisée par les tests. Restent ci-dessous les faits **géographiques**, à confirmer par une source (IGN Géoportail, SANDRE pour les cours d'eau, Wikipédia en recoupement). Cocher `[x]` une fois vérifié ; en cas de doute, passer la valeur à `null` dans `src/data/communes.js`.

## Fiches communes

| ✓ | Commune | Littoral | Mer | Cours d'eau (VRAI) | Massif |
|---|---|---|---|---|---|
| [ ] | Agen (47) | non | — | Garonne | non |
| [ ] | Ajaccio (2A) | oui | Méditerranée | — | _zone grise_ |
| [ ] | Albi (81) | non | — | Tarn | non |
| [ ] | Amiens (80) | non | — | Somme | non |
| [ ] | Angers (49) | non | — | Maine | non |
| [ ] | Annecy (74) | non | — | — | Alpes |
| [ ] | Arles (13) | _zone grise_ | — | Rhône | non |
| [ ] | Arras (62) | non | — | — | non |
| [ ] | Auxerre (89) | non | — | Yonne | non |
| [ ] | Avignon (84) | non | — | Rhône | non |
| [ ] | Bastia (2B) | oui | Méditerranée | — | _zone grise_ |
| [ ] | Belfort (90) | non | — | — | _zone grise_ |
| [ ] | Bergerac (24) | non | — | Dordogne | non |
| [ ] | Besançon (25) | non | — | Doubs | _zone grise_ |
| [ ] | Biarritz (64) | oui | Atlantique | — | non |
| [ ] | Blois (41) | non | — | Loire | non |
| [ ] | Bordeaux (33) | non | — | Garonne | non |
| [ ] | Boulogne-sur-Mer (62) | oui | Manche | — | non |
| [ ] | Bourges (18) | non | — | — | non |
| [ ] | Brest (29) | oui | Atlantique | — | non |
| [ ] | Briançon (05) | non | — | — | Alpes |
| [ ] | Caen (14) | _zone grise_ | — | Orne | non |
| [ ] | Calais (62) | oui | — | — | non |
| [ ] | Cannes (06) | oui | Méditerranée | — | _zone grise_ |
| [ ] | Carcassonne (11) | non | — | Aude | _zone grise_ |
| [ ] | Cauterets (65) | non | — | — | Pyrénées |
| [ ] | Chalon-sur-Saône (71) | non | — | Saône | non |
| [ ] | Châlons-en-Champagne (51) | non | — | Marne | non |
| [ ] | Chambéry (73) | non | — | — | Alpes |
| [ ] | Chamonix-Mont-Blanc (74) | non | — | — | Alpes |
| [ ] | Chartres (28) | non | — | Eure | non |
| [ ] | Cherbourg-en-Cotentin (50) | oui | Manche | — | non |
| [ ] | Clermont-Ferrand (63) | non | — | — | Massif central |
| [ ] | Colmar (68) | non | — | — | non |
| [ ] | Digne-les-Bains (04) | non | — | — | Alpes |
| [ ] | Dijon (21) | non | — | — | _zone grise_ |
| [ ] | Dunkerque (59) | oui | Mer du Nord | — | non |
| [ ] | Gap (05) | non | — | — | Alpes |
| [ ] | Gérardmer (88) | non | — | — | Vosges |
| [ ] | Grenoble (38) | non | — | Isère, Drac | Alpes |
| [ ] | La Roche-sur-Yon (85) | non | — | — | non |
| [ ] | La Rochelle (17) | oui | Atlantique | — | non |
| [ ] | Le Havre (76) | oui | Manche | — | non |
| [ ] | Le Mans (72) | non | — | Sarthe | non |
| [ ] | Le Puy-en-Velay (43) | non | — | — | Massif central |
| [ ] | Lille (59) | non | — | — | non |
| [ ] | Limoges (87) | non | — | Vienne | _zone grise_ |
| [ ] | Lyon (69) | non | — | Rhône, Saône | non |
| [ ] | Mâcon (71) | non | — | Saône | non |
| [ ] | Marseille (13) | oui | Méditerranée | — | non |
| [ ] | Metz (57) | non | — | Moselle | non |
| [ ] | Montpellier (34) | non | — | — | _zone grise_ |
| [ ] | Moulins (03) | non | — | Allier | non |
| [ ] | Mulhouse (68) | non | — | — | non |
| [ ] | Nancy (54) | non | — | Meurthe | non |
| [ ] | Nantes (44) | non | — | Loire | non |
| [ ] | Nevers (58) | non | — | Loire | non |
| [ ] | Nice (06) | oui | Méditerranée | — | _zone grise_ |
| [ ] | Nîmes (30) | non | — | — | _zone grise_ |
| [ ] | Orléans (45) | non | — | Loire | non |
| [ ] | Paris (75) | non | — | Seine | non |
| [ ] | Pau (64) | non | — | — | _zone grise_ |
| [ ] | Perpignan (66) | _zone grise_ | — | — | _zone grise_ |
| [ ] | Poitiers (86) | non | — | Clain | non |
| [ ] | Quimper (29) | _zone grise_ | — | — | non |
| [ ] | Reims (51) | non | — | — | non |
| [ ] | Rennes (35) | non | — | Vilaine | non |
| [ ] | Rodez (12) | non | — | — | Massif central |
| [ ] | Rouen (76) | non | — | Seine | non |
| [ ] | Saint-Brieuc (22) | _zone grise_ | — | — | non |
| [ ] | Saint-Étienne (42) | non | — | — | _zone grise_ |
| [ ] | Saint-Malo (35) | oui | Manche | — | non |
| [ ] | Saint-Nazaire (44) | oui | Atlantique | — | non |
| [ ] | Sète (34) | oui | Méditerranée | — | non |
| [ ] | Strasbourg (67) | non | — | Rhin, Ill | non |
| [ ] | Toulon (83) | oui | Méditerranée | — | _zone grise_ |
| [ ] | Toulouse (31) | non | — | Garonne | non |
| [ ] | Tours (37) | non | — | Loire, Cher | non |
| [ ] | Troyes (10) | non | — | Seine | non |
| [ ] | Valence (26) | non | — | Rhône | _zone grise_ |
| [ ] | Vannes (56) | _zone grise_ | — | — | non |
| [ ] | Versailles (78) | non | — | — | non |
| [ ] | Vichy (03) | non | — | Allier | _zone grise_ |

## Régions des cours d'eau

Une fausse déclaration « au bord de X » n'est produite que pour une commune située HORS de ces régions. Il faut donc vérifier qu'aucune région touchée par le cours d'eau ne manque (une région en trop est sans danger).

- [ ] **Loire** : Auvergne-Rhône-Alpes, Bourgogne-Franche-Comté, Centre-Val de Loire, Pays de la Loire
- [ ] **Seine** : Bourgogne-Franche-Comté, Grand Est, Île-de-France, Normandie
- [ ] **Rhône** : Auvergne-Rhône-Alpes, Provence-Alpes-Côte d'Azur, Occitanie
- [ ] **Garonne** : Occitanie, Nouvelle-Aquitaine
- [ ] **Saône** : Grand Est, Bourgogne-Franche-Comté, Auvergne-Rhône-Alpes
- [ ] **Dordogne** : Auvergne-Rhône-Alpes, Nouvelle-Aquitaine, Occitanie
- [ ] **Rhin** : Grand Est
- [ ] **Moselle** : Grand Est
- [ ] **Isère** : Auvergne-Rhône-Alpes
- [ ] **Allier** : Auvergne-Rhône-Alpes, Occitanie, Bourgogne-Franche-Comté, Centre-Val de Loire
- [ ] **Marne** : Grand Est, Hauts-de-France, Île-de-France
- [ ] **Somme** : Hauts-de-France
- [ ] **Vilaine** : Bretagne, Pays de la Loire
- [ ] **Doubs** : Bourgogne-Franche-Comté
- [ ] **Tarn** : Occitanie

## Régions des massifs

Même principe : aucune région concernée ne doit manquer.

- [ ] **Alpes** : Auvergne-Rhône-Alpes, Provence-Alpes-Côte d'Azur
- [ ] **Pyrénées** : Occitanie, Nouvelle-Aquitaine
- [ ] **Vosges** : Grand Est, Bourgogne-Franche-Comté
- [ ] **Jura** : Bourgogne-Franche-Comté, Auvergne-Rhône-Alpes
- [ ] **Massif central** : Auvergne-Rhône-Alpes, Occitanie, Nouvelle-Aquitaine, Bourgogne-Franche-Comté

## Questions bonus du téléphone (src/data/culture.js)

Vérifier la bonne réponse ET que les deux autres choix sont bien faux.

- [ ] Quel est le plus long fleuve de France ? → **La Loire** (faux : La Seine, Le Rhône)
- [ ] Quel est le point culminant des Alpes et de la France ? → **Le mont Blanc** (faux : La Barre des Écrins, La Meije)
- [ ] Dans quel pays le Rhône prend-il sa source ? → **En Suisse** (faux : En France, En Italie)
- [ ] Dans quel pays la Garonne prend-elle sa source ? → **En Espagne** (faux : En France, En Andorre)
- [ ] Dans quelle mer se jette la Seine ? → **La Manche** (faux : La mer du Nord, L'océan Atlantique)
- [ ] Quel delta forme la Camargue ? → **Le delta du Rhône** (faux : Le delta de la Loire, Le delta de la Garonne)
- [ ] Quels fleuves se rejoignent pour former l'estuaire de la Gironde ? → **La Garonne et la Dordogne** (faux : La Garonne et le Lot, La Dordogne et la Charente)
- [ ] Quelle est la plus grande île de France métropolitaine ? → **La Corse** (faux : L'île d'Oléron, Belle-Île-en-Mer)
- [ ] Dans quel département se trouve l'île d'Oléron ? → **Charente-Maritime** (faux : Vendée, Gironde)
- [ ] Dans quel département se trouve Belle-Île-en-Mer ? → **Morbihan** (faux : Finistère, Loire-Atlantique)
- [ ] Dans quel département se trouve le Mont-Saint-Michel ? → **Manche** (faux : Ille-et-Vilaine, Calvados)
- [ ] Dans quel département se trouve la dune du Pilat ? → **Gironde** (faux : Landes, Charente-Maritime)
- [ ] Dans quel département se trouvent les falaises d'Étretat ? → **Seine-Maritime** (faux : Calvados, Somme)
- [ ] Dans quel département se trouve le mont Ventoux ? → **Vaucluse** (faux : Drôme, Alpes-de-Haute-Provence)
- [ ] Quel est le point culminant du Massif central ? → **Le puy de Sancy** (faux : Le puy de Dôme, Le plomb du Cantal)
- [ ] Quel est le point culminant des Vosges ? → **Le Grand Ballon** (faux : Le Hohneck, Le ballon d'Alsace)
- [ ] Quel est le point culminant des Pyrénées françaises ? → **Le Vignemale** (faux : Le pic du Midi de Bigorre, Le Canigou)
- [ ] Quelle rivière franchit le viaduc de Millau ? → **Le Tarn** (faux : L'Aveyron, Le Lot)
- [ ] Quelle rivière franchit le pont du Gard ? → **Le Gardon** (faux : Le Rhône, L'Hérault)
- [ ] Quelles villes relie le canal du Midi ? → **Toulouse et l'étang de Thau** (faux : Bordeaux et Toulouse, Lyon et Marseille)
- [ ] Quel marais est surnommé « la Venise verte » ? → **Le Marais poitevin** (faux : La Brière, Le marais Vernier)
- [ ] Avec combien de pays la France métropolitaine a-t-elle une frontière terrestre ? → **8** (faux : 6, 10)
- [ ] Quel pays partage la plus longue frontière terrestre avec la France ? → **Le Brésil** (faux : L'Espagne, La Belgique)
- [ ] Combien de régions compte la France métropolitaine depuis 2016 ? → **13** (faux : 18, 22)
- [ ] Quelle est la préfecture de la Guadeloupe ? → **Basse-Terre** (faux : Pointe-à-Pitre, Le Gosier)
- [ ] Quelle est la préfecture de La Réunion ? → **Saint-Denis** (faux : Saint-Pierre, Le Port)
- [ ] Quelle est la plus vaste commune de France ? → **Maripasoula (Guyane)** (faux : Arles, Paris)
- [ ] Quel est le département le plus peuplé de France ? → **Le Nord** (faux : Paris, Les Bouches-du-Rhône)
- [ ] Quel lac est partagé entre la France et la Suisse ? → **Le lac Léman** (faux : Le lac d'Annecy, Le lac du Bourget)
- [ ] Quel est le plus grand lac naturel entièrement français ? → **Le lac du Bourget** (faux : Le lac d'Annecy, Le lac de Serre-Ponçon)
- [ ] Dans quel massif se trouve le cirque de Gavarnie ? → **Les Pyrénées** (faux : Les Alpes, Le Massif central)
- [ ] Quelle rivière creuse les gorges du Verdon ? → **Le Verdon** (faux : La Durance, Le Var)
- [ ] Quelle île bretonne marque l'extrémité ouest de la France métropolitaine ? → **Ouessant** (faux : Bréhat, Groix)
- [ ] Quel fleuve forme une partie de la frontière avec l'Allemagne ? → **Le Rhin** (faux : La Moselle, La Meuse)
- [ ] Depuis quelle année Mayotte est-elle un département français ? → **2011** (faux : 1976, 1999)

## Pistes de dossiers « très difficiles » (en zone grise, à vérifier avant usage)

- Arles touche-t-elle la Méditerranée (Camargue, plage de Piémanson) ? Si oui : `littoral: true, mer: 'Méditerranée'` → dossier piège « Arles demande le Fonds littoral » = ACCEPTER.
- Saint-Étienne longe-t-elle la Loire (ancienne commune de Saint-Victor-sur-Loire) ? Si oui : ajouter `Loire`.
- Perpignan a-t-elle une façade maritime ? Calais borde-t-elle la Manche ou la mer du Nord (limite OHI) ?
- Caen, Quimper, Vannes, Saint-Brieuc : bordées par la mer ou seulement par un estuaire, une rade, un golfe ?

_83 communes, 101 départements._
