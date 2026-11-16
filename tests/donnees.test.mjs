// Intégrité interne de la base : aucune contradiction possible entre tables.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, DEPARTEMENTS, CHEFS_LIEUX } from '../src/data/territoires.js';
import { COMMUNES } from '../src/data/communes.js';
import { COURS_EAU, MASSIFS, MERS } from '../src/data/geographie.js';

test('101 départements, 18 régions, chaque département pointe vers une région existante', () => {
  assert.equal(Object.keys(DEPARTEMENTS).length, 101);
  assert.equal(Object.keys(REGIONS).length, 18);
  for (const [code, d] of Object.entries(DEPARTEMENTS)) assert.ok(REGIONS[d.region], code);
  for (const r of Object.keys(REGIONS))
    assert.ok(Object.values(DEPARTEMENTS).some((d) => d.region === r), `région vide ${r}`);
});

test('fiches communes cohérentes', () => {
  const noms = new Set(), codes = new Set();
  for (const c of COMMUNES) {
    const id = `${c.nom} (${c.insee})`;
    assert.ok(DEPARTEMENTS[c.dep], `${id} : département inconnu`);
    assert.ok(c.insee.startsWith(c.dep), `${id} : le code INSEE doit commencer par le département`);
    assert.equal(c.insee.length, 5, id);
    assert.ok(!noms.has(c.nom), `${id} : nom en double`); noms.add(c.nom);
    assert.ok(!codes.has(c.insee), `${id} : code en double`); codes.add(c.insee);
    assert.equal(typeof c.prefecture, 'boolean', id);
    assert.ok([true, false, null].includes(c.littoral), id);
    if (c.mer !== null) {
      assert.ok(MERS[c.mer], `${id} : mer inconnue`);
      assert.equal(c.littoral, true, `${id} : une mer suppose une commune littorale`);
    }
    for (const f of c.fleuves) {
      assert.ok(COURS_EAU[f], `${id} : cours d'eau inconnu ${f}`);
      const regs = COURS_EAU[f].regions;
      if (regs) assert.ok(regs.includes(DEPARTEMENTS[c.dep].region),
        `${id} : ${f} est déclaré ici mais sa liste de régions ne contient pas celle de la commune`);
    }
    if (typeof c.massif === 'string') {
      assert.ok(MASSIFS[c.massif], `${id} : massif inconnu`);
      assert.ok(MASSIFS[c.massif].regions.includes(DEPARTEMENTS[c.dep].region), `${id} : massif hors régions`);
    } else assert.ok([false, null].includes(c.massif), id);
  }
});

test('au plus une préfecture par département', () => {
  const vus = {};
  for (const c of COMMUNES.filter((c) => c.prefecture)) {
    assert.ok(!vus[c.dep], `deux préfectures pour ${c.dep} : ${vus[c.dep]} et ${c.nom}`);
    vus[c.dep] = c.nom;
  }
});

test('double saisie : fiche commune et table des chefs-lieux concordent', () => {
  assert.equal(Object.keys(CHEFS_LIEUX).length, 101);
  for (const c of COMMUNES) {
    const chef = CHEFS_LIEUX[c.dep];
    if (chef === null) assert.equal(c.prefecture, false, c.nom);
    else assert.equal(c.prefecture, chef === c.nom, `${c.nom} : fiche=${c.prefecture}, chef-lieu du ${c.dep}=${chef}`);
  }
});

test('la base couvre les trois sections de la campagne', () => {
  assert.ok(COMMUNES.length >= 50);
});
