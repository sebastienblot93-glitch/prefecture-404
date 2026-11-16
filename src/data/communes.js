// Préfecture 404 — Fiches communes
// -------------------------------------------------------------
// Champs :
//   insee      code officiel géographique (COG). Vérifié par tools/verifier-officiel.mjs
//   nom        nom officiel. Vérifié par tools/verifier-officiel.mjs
//   dep        code département. Vérifié par tools/verifier-officiel.mjs
//   prefecture true si chef-lieu de département (relecture humaine : docs/DONNEES.md)
//   littoral   true = bordée par la mer · false = certainement pas · null = zone grise
//   mer        mer bordante si littoral et certaine, sinon null
//   fleuves    cours d'eau qui traversent ou longent la commune (VRAI certain).
//              L'absence d'un cours d'eau ne signifie PAS « faux » (voir geographie.js).
//   massif     nom du massif · false = certainement hors massif · null = zone grise
//   note       piège pédagogique, affiché dans l'explication après une erreur
//
// Règle d'or : en cas de doute, mettre null. Une zone grise ne crée jamais
// d'incohérence ; une affirmation fausse dans la base en crée toujours.

const C = (insee, nom, dep, prefecture, littoral, mer, fleuves, massif, note = null) =>
  ({ insee, nom, dep, prefecture, littoral, mer, fleuves, massif, note });

export const COMMUNES = [
  // ——— Bretagne (53)
  C('35238', 'Rennes', '35', true, false, null, ['Vilaine'], false),
  C('35288', 'Saint-Malo', '35', false, true, 'Manche', [], false),
  C('29019', 'Brest', '29', false, true, 'Atlantique', [], false,
    "Brest est la plus grande ville du Finistère, mais la préfecture est Quimper."),
  C('29232', 'Quimper', '29', true, null, null, [], false),
  C('56260', 'Vannes', '56', true, null, null, [], false),
  C('22278', 'Saint-Brieuc', '22', true, null, null, [], false),

  // ——— Normandie (28)
  C('76540', 'Rouen', '76', true, false, null, ['Seine'], false),
  C('76351', 'Le Havre', '76', false, true, 'Manche', [], false,
    "Le Havre est la commune la plus peuplée de Seine-Maritime, mais la préfecture est Rouen."),
  C('14118', 'Caen', '14', true, null, null, ['Orne'], false,
    "Caen est dans le Calvados. La Manche est à la fois une mer et un autre département normand."),
  C('50129', 'Cherbourg-en-Cotentin', '50', false, true, 'Manche', [], false,
    "Cherbourg-en-Cotentin est dans la Manche, dont la préfecture est Saint-Lô."),

  // ——— Pays de la Loire (52)
  C('44109', 'Nantes', '44', true, false, null, ['Loire'], false,
    "Nantes fut la capitale des ducs de Bretagne, mais elle appartient administrativement à la région Pays de la Loire."),
  C('44184', 'Saint-Nazaire', '44', false, true, 'Atlantique', [], false),
  C('49007', 'Angers', '49', true, false, null, ['Maine'], false),
  C('72181', 'Le Mans', '72', true, false, null, ['Sarthe'], false),
  C('85191', 'La Roche-sur-Yon', '85', true, false, null, [], false),

  // ——— Centre-Val de Loire (24)
  C('45234', 'Orléans', '45', true, false, null, ['Loire'], false),
  C('37261', 'Tours', '37', true, false, null, ['Loire', 'Cher'], false),
  C('41018', 'Blois', '41', true, false, null, ['Loire'], false),
  C('28085', 'Chartres', '28', true, false, null, ['Eure'], false),
  C('18033', 'Bourges', '18', true, false, null, [], false),

  // ——— Nouvelle-Aquitaine (75)
  C('33063', 'Bordeaux', '33', true, false, null, ['Garonne'], false),
  C('17300', 'La Rochelle', '17', true, true, 'Atlantique', [], false),
  C('64122', 'Biarritz', '64', false, true, 'Atlantique', [], false,
    "Biarritz est au Pays basque, dans les Pyrénées-Atlantiques, en Nouvelle-Aquitaine."),
  C('64445', 'Pau', '64', true, false, null, [], null),
  C('87085', 'Limoges', '87', true, false, null, ['Vienne'], null),
  C('86194', 'Poitiers', '86', true, false, null, ['Clain'], false),
  C('47001', 'Agen', '47', true, false, null, ['Garonne'], false),
  C('24037', 'Bergerac', '24', false, false, null, ['Dordogne'], false,
    "Bergerac est au bord de la Dordogne, mais la préfecture du département est Périgueux."),

  // ——— Auvergne-Rhône-Alpes (84)
  C('69123', 'Lyon', '69', true, false, null, ['Rhône', 'Saône'], false),
  C('38185', 'Grenoble', '38', true, false, null, ['Isère', 'Drac'], 'Alpes',
    "Grenoble est au cœur des Alpes, à plus de 200 km de la mer."),
  C('74056', 'Chamonix-Mont-Blanc', '74', false, false, null, [], 'Alpes'),
  C('74010', 'Annecy', '74', true, false, null, [], 'Alpes'),
  C('73065', 'Chambéry', '73', true, false, null, [], 'Alpes'),
  C('63113', 'Clermont-Ferrand', '63', true, false, null, [], 'Massif central'),
  C('43157', 'Le Puy-en-Velay', '43', true, false, null, [], 'Massif central'),
  C('42218', 'Saint-Étienne', '42', true, false, null, [], null,
    "Saint-Étienne est la préfecture de la Loire (le département)."),
  C('26362', 'Valence', '26', true, false, null, ['Rhône'], null),
  C('03190', 'Moulins', '03', true, false, null, ['Allier'], false),
  C('03310', 'Vichy', '03', false, false, null, ['Allier'], null),

  // ——— Provence-Alpes-Côte d'Azur (93)
  C('13055', 'Marseille', '13', true, true, 'Méditerranée', [], false),
  C('06088', 'Nice', '06', true, true, 'Méditerranée', [], null),
  C('83137', 'Toulon', '83', true, true, 'Méditerranée', [], null),
  C('06029', 'Cannes', '06', false, true, 'Méditerranée', [], null),
  C('84007', 'Avignon', '84', true, false, null, ['Rhône'], false),
  C('13004', 'Arles', '13', false, null, null, ['Rhône'], false,
    "Arles est la plus vaste commune de France métropolitaine : elle s'étend jusqu'en Camargue."),
  C('05061', 'Gap', '05', true, false, null, [], 'Alpes'),
  C('05023', 'Briançon', '05', false, false, null, [], 'Alpes'),
  C('04070', 'Digne-les-Bains', '04', true, false, null, [], 'Alpes'),

  // ——— Occitanie (76)
  C('31555', 'Toulouse', '31', true, false, null, ['Garonne'], false,
    "Toulouse est traversée par la Garonne. La Loire coule bien plus au nord."),
  C('34172', 'Montpellier', '34', true, false, null, [], null,
    "Montpellier est à une dizaine de kilomètres de la mer : la commune n'a pas de façade maritime."),
  C('34301', 'Sète', '34', false, true, 'Méditerranée', [], false),
  C('30189', 'Nîmes', '30', true, false, null, [], null),
  C('11069', 'Carcassonne', '11', true, false, null, ['Aude'], null),
  C('81004', 'Albi', '81', true, false, null, ['Tarn'], false),
  C('12202', 'Rodez', '12', true, false, null, [], 'Massif central'),
  C('65138', 'Cauterets', '65', false, false, null, [], 'Pyrénées'),
  C('66136', 'Perpignan', '66', true, null, null, [], null),

  // ——— Corse (94)
  C('2A004', 'Ajaccio', '2A', true, true, 'Méditerranée', [], null,
    "Ajaccio est la préfecture de la Corse-du-Sud (2A) ; Bastia celle de la Haute-Corse (2B)."),
  C('2B033', 'Bastia', '2B', true, true, 'Méditerranée', [], null),

  // ——— Grand Est (44)
  C('67482', 'Strasbourg', '67', true, false, null, ['Rhin', 'Ill'], false),
  C('57463', 'Metz', '57', true, false, null, ['Moselle'], false),
  C('54395', 'Nancy', '54', true, false, null, ['Meurthe'], false),
  C('51454', 'Reims', '51', false, false, null, [], false,
    "Reims est la plus grande ville de la Marne, mais la préfecture est Châlons-en-Champagne."),
  C('51108', 'Châlons-en-Champagne', '51', true, false, null, ['Marne'], false),
  C('68066', 'Colmar', '68', true, false, null, [], false),
  C('68224', 'Mulhouse', '68', false, false, null, [], false,
    "Mulhouse est la plus grande ville du Haut-Rhin, mais la préfecture est Colmar."),
  C('10387', 'Troyes', '10', true, false, null, ['Seine'], false,
    "Troyes est dans l'Aube : la Seine traverse la ville avant de rejoindre Paris."),
  C('88196', 'Gérardmer', '88', false, false, null, [], 'Vosges'),

  // ——— Hauts-de-France (32)
  C('59350', 'Lille', '59', true, false, null, [], false),
  C('59183', 'Dunkerque', '59', false, true, 'Mer du Nord', [], false),
  C('62193', 'Calais', '62', false, true, null, [], false),
  C('62160', 'Boulogne-sur-Mer', '62', false, true, 'Manche', [], false),
  C('80021', 'Amiens', '80', true, false, null, ['Somme'], false),
  C('62041', 'Arras', '62', true, false, null, [], false),

  // ——— Île-de-France (11)
  C('75056', 'Paris', '75', true, false, null, ['Seine'], false),
  C('78646', 'Versailles', '78', true, false, null, [], false),

  // ——— Bourgogne-Franche-Comté (27)
  C('21231', 'Dijon', '21', true, false, null, [], null),
  C('25056', 'Besançon', '25', true, false, null, ['Doubs'], null),
  C('58194', 'Nevers', '58', true, false, null, ['Loire'], false),
  C('71270', 'Mâcon', '71', true, false, null, ['Saône'], false),
  C('71076', 'Chalon-sur-Saône', '71', false, false, null, ['Saône'], false,
    "Chalon-sur-Saône est la plus grande ville de Saône-et-Loire, mais la préfecture est Mâcon."),
  C('89024', 'Auxerre', '89', true, false, null, ['Yonne'], false),
  C('90010', 'Belfort', '90', true, false, null, [], null),
];

export const COMMUNE_PAR_INSEE = Object.fromEntries(COMMUNES.map((c) => [c.insee, c]));
export const COMMUNE_PAR_NOM = Object.fromEntries(COMMUNES.map((c) => [c.nom, c]));
