// Chaque dossier écrit à la main doit être (1) entièrement décidable et
// (2) recevoir du moteur exactement le verdict prévu par l'auteur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JOURNEES, contexteDe } from '../src/campagne/journees.js';
import { valider, decider } from '../src/moteur/regles.js';

for (const j of JOURNEES) {
  test(`${j.titre} : ${j.dossiers.length} dossiers cohérents`, () => {
    assert.equal(j.dossiers.length, j.tutoriel ? 7 : 8);
    const ctx = contexteDe(j);
    const vus = new Set();
    for (const d of j.dossiers) {
      assert.deepEqual(valider(d), [], `${d.id} invalide`);
      const r = decider(d, ctx);
      assert.equal(r.decision, d.attendu, `${d.id} : moteur=${r.decision}, auteur=${d.attendu}\n${[...r.explications, ...r.motifs].join('\n')}`);
      if (d.destination) assert.equal(r.destination, d.destination, d.id);
      vus.add(r.decision);
    }
    assert.equal(vus.size, 4, 'chaque journée doit utiliser les quatre tampons');
  });
}
