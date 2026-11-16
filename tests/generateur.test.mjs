import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerHasard } from '../src/moteur/hasard.js';
import { genererDossier } from '../src/moteur/generateur.js';
import { valider, decider, SECTIONS } from '../src/moteur/regles.js';
import { DECRETS_POSSIBLES } from '../src/campagne/infini.js';

const sections = Object.keys(SECTIONS);

test('3 000 dossiers générés : tous valides, verdicts variés', () => {
  const compte = { ACCEPTER: 0, RECTIFIER: 0, REFUSER: 0, TRANSFERER: 0 };
  for (let g = 0; g < 3000; g++) {
    const h = creerHasard(g);
    const niveau = 1 + (g % 3);
    const ctx = {
      regions: SECTIONS[sections[g % 3]].regions,
      decrets: niveau === 3 ? h.melanger(DECRETS_POSSIBLES).slice(0, 2) : [],
    };
    const d = genererDossier(h, ctx, niveau, g);
    assert.deepEqual(valider(d), [], `graine ${g}`);
    compte[decider(d, ctx).decision]++;
  }
  for (const [k, n] of Object.entries(compte)) assert.ok(n > 200, `${k} trop rare : ${n}`);
});

test('même graine, même dossier', () => {
  const ctx = { regions: SECTIONS.OUEST.regions, decrets: [] };
  assert.deepEqual(genererDossier(creerHasard('abc'), ctx, 2), genererDossier(creerHasard('abc'), ctx, 2));
});
