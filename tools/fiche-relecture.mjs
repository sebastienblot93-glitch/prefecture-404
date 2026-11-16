#!/usr/bin/env node
// Génère docs/RELECTURE.md : la liste de TOUS les faits géographiques que le
// jeu peut affirmer et qui ne sont pas couverts par l'API officielle
// (littoral, mer, cours d'eau, massifs). Un relecteur humain coche chaque ligne.
//   node tools/fiche-relecture.mjs > docs/RELECTURE.md
import { COMMUNES } from '../src/data/communes.js';
import { DEPARTEMENTS, REGIONS } from '../src/data/territoires.js';
import { COURS_EAU, MASSIFS } from '../src/data/geographie.js';
import { CULTURE } from '../src/data/culture.js';

const L = [];
L.push('# Fiche de relecture des faits géographiques', '');
L.push('Générée par `node tools/fiche-relecture.mjs > docs/RELECTURE.md`. Ne pas modifier à la main.', '');
L.push('Les faits administratifs (codes, noms, départements, régions) sont vérifiés automatiquement par `tools/verifier-officiel.mjs`. Les chefs-lieux sont en double saisie croisée par les tests. Restent ci-dessous les faits **géographiques**, à confirmer par une source (IGN Géoportail, SANDRE pour les cours d\'eau, Wikipédia en recoupement). Cocher `[x]` une fois vérifié ; en cas de doute, passer la valeur à `null` dans `src/data/communes.js`.', '');

L.push('## Fiches communes', '');
L.push('| ✓ | Commune | Littoral | Mer | Cours d\'eau (VRAI) | Massif |', '|---|---|---|---|---|---|');
const aff = (v) => (v === null ? '_zone grise_' : v === false ? 'non' : v === true ? 'oui' : v);
for (const c of [...COMMUNES].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')))
  L.push(`| [ ] | ${c.nom} (${c.dep}) | ${aff(c.littoral)} | ${c.mer ?? '—'} | ${c.fleuves.join(', ') || '—'} | ${aff(c.massif)} |`);

L.push('', '## Régions des cours d\'eau', '');
L.push('Une fausse déclaration « au bord de X » n\'est produite que pour une commune située HORS de ces régions. Il faut donc vérifier qu\'aucune région touchée par le cours d\'eau ne manque (une région en trop est sans danger).', '');
for (const [n, f] of Object.entries(COURS_EAU))
  if (f.regions) L.push(`- [ ] **${n}** : ${f.regions.map((r) => REGIONS[r]).join(', ')}`);

L.push('', '## Régions des massifs', '', 'Même principe : aucune région concernée ne doit manquer.', '');
for (const [n, m] of Object.entries(MASSIFS)) L.push(`- [ ] **${n}** : ${m.regions.map((r) => REGIONS[r]).join(', ')}`);

L.push('', '## Questions bonus du téléphone (src/data/culture.js)', '', 'Vérifier la bonne réponse ET que les deux autres choix sont bien faux.', '');
for (const q of CULTURE) L.push(`- [ ] ${q.question} → **${q.bonne}** (faux : ${q.faux.join(', ')})`);

L.push('', '## Pistes de dossiers « très difficiles » (en zone grise, à vérifier avant usage)', '');
L.push('- Arles touche-t-elle la Méditerranée (Camargue, plage de Piémanson) ? Si oui : `littoral: true, mer: \'Méditerranée\'` → dossier piège « Arles demande le Fonds littoral » = ACCEPTER.');
L.push('- Saint-Étienne longe-t-elle la Loire (ancienne commune de Saint-Victor-sur-Loire) ? Si oui : ajouter `Loire`.');
L.push('- Perpignan a-t-elle une façade maritime ? Calais borde-t-elle la Manche ou la mer du Nord (limite OHI) ?');
L.push('- Caen, Quimper, Vannes, Saint-Brieuc : bordées par la mer ou seulement par un estuaire, une rade, un golfe ?');
L.push('');
L.push(`_${COMMUNES.length} communes, ${Object.keys(DEPARTEMENTS).length} départements._`);
console.log(L.join('\n'));
