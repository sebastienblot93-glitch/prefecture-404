#!/usr/bin/env node
// Vérifie le référentiel administratif contre l'API officielle de l'État
// (geo.api.gouv.fr, alimentée par le Code officiel géographique de l'INSEE).
//   node tools/verifier-officiel.mjs
// Contrôles : noms et codes des régions, noms/codes/régions des départements,
// et pour chaque commune : existence du code INSEE, nom, département, région.
// Code de sortie 1 si une divergence est trouvée.
import { REGIONS, DEPARTEMENTS } from '../src/data/territoires.js';
import { COMMUNES } from '../src/data/communes.js';

const API = 'https://geo.api.gouv.fr';
const norm = (s) => String(s ?? '').replace(/[’‘]/g, "'").normalize('NFC').trim();
const ecarts = [];
const ecart = (quoi, attendu, officiel) => ecarts.push({ quoi, attendu, officiel });

async function lire(chemin, essais = 5, delai = 20000) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(API + chemin, {
        headers: { accept: 'application/json', 'user-agent': 'prefecture-404-verification' },
        signal: AbortSignal.timeout(delai),
      });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i >= essais) throw new Error(`${chemin} : ${e.message}`);
      console.log(`  nouvel essai (${e.message})…`);
      await new Promise((ok) => setTimeout(ok, 2000 * i));
    }
  }
}

console.log(`Interrogation de ${API}…`);
const regions = await lire('/regions');
console.log(`  ${regions.length} régions reçues`);
const offR = Object.fromEntries(regions.map((r) => [r.code, r.nom]));
for (const [code, nom] of Object.entries(REGIONS)) {
  if (!offR[code]) ecart(`Région ${code}`, nom, 'code inexistant');
  else if (norm(offR[code]) !== norm(nom)) ecart(`Région ${code}`, nom, offR[code]);
}
for (const code of Object.keys(offR)) if (!REGIONS[code]) ecart(`Région ${code}`, 'absente du jeu', offR[code]);

const deps = await lire('/departements');
console.log(`  ${deps.length} départements reçus`);
const offD = Object.fromEntries(deps.map((d) => [d.code, d]));
for (const [code, d] of Object.entries(DEPARTEMENTS)) {
  const o = offD[code];
  if (!o) { ecart(`Département ${code}`, d.nom, 'code inexistant'); continue; }
  if (norm(o.nom) !== norm(d.nom)) ecart(`Département ${code} (nom)`, d.nom, o.nom);
  if (o.codeRegion !== d.region) ecart(`Département ${code} (région)`, d.region, o.codeRegion);
}
for (const code of Object.keys(offD)) if (!DEPARTEMENTS[code]) ecart(`Département ${code}`, 'absent du jeu', offD[code].nom);

// Une seule requête : la liste officielle complète des communes (~35 000).
const toutes = await lire('/communes?fields=nom,code,codeDepartement,codeRegion&format=json', 5, 90000);
console.log(`  ${toutes.length} communes officielles reçues`);
const offC = Object.fromEntries(toutes.map((c) => [c.code, c]));
for (const c of COMMUNES) {
  const o = offC[c.insee];
  if (!o) { ecart(`Commune ${c.insee}`, c.nom, 'code INSEE inexistant'); continue; }
  if (norm(o.nom) !== norm(c.nom)) ecart(`Commune ${c.insee} (nom)`, c.nom, o.nom);
  if (o.codeDepartement !== c.dep) ecart(`Commune ${c.nom} (département)`, c.dep, o.codeDepartement);
  if (o.codeRegion !== DEPARTEMENTS[c.dep]?.region) ecart(`Commune ${c.nom} (région)`, DEPARTEMENTS[c.dep]?.region, o.codeRegion);
}

console.log(`Contrôlé : ${Object.keys(REGIONS).length} régions, ${Object.keys(DEPARTEMENTS).length} départements, ${COMMUNES.length} communes.`);
if (ecarts.length) {
  console.log(`\n${ecarts.length} divergence(s) avec le référentiel officiel :`);
  for (const e of ecarts) console.log(`  ✗ ${e.quoi} — jeu : ${e.attendu} | officiel : ${e.officiel}`);
  process.exit(1);
}
console.log('Aucune divergence : référentiel administratif conforme.');
