import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMMUNE_PAR_NOM as N } from '../src/data/communes.js';
import { evaluer } from '../src/moteur/verite.js';
import { decider, valider, noter, SECTIONS } from '../src/moteur/regles.js';

const st = (nom, type, valeur) => evaluer(N[nom], { type, valeur }).statut;

test('faits de référence', () => {
  assert.equal(st('Saint-Malo', 'dep', '35'), 'vrai');
  assert.equal(st('Nantes', 'region', '53'), 'faux');
  assert.equal(st('Reims', 'prefecture', true), 'faux');
  assert.equal(st('Grenoble', 'littoral', true), 'faux');
  assert.equal(st('Toulouse', 'fleuve', 'Loire'), 'faux');
  assert.equal(st('Lyon', 'fleuve', 'Saône'), 'vrai');
  assert.equal(st('Paris', 'massif', 'Alpes'), 'faux');
  assert.equal(st('Chamonix-Mont-Blanc', 'massif', 'Jura'), 'faux');
  assert.equal(st('Marseille', 'mer', 'Atlantique'), 'faux');
  assert.equal(st('Lyon', 'mer', 'Manche'), 'faux');
});

test('les zones grises sont indécidables', () => {
  assert.equal(st('Arles', 'littoral', true), 'indecidable');
  assert.equal(st('Calais', 'mer', 'Manche'), 'indecidable');
  assert.equal(st('Nevers', 'fleuve', 'Allier'), 'indecidable'); // l'Allier conflue près de Nevers
  assert.equal(st('Saint-Étienne', 'fleuve', 'Loire'), 'indecidable');
  assert.equal(st('Nice', 'massif', 'Alpes'), 'indecidable');
});

const base = (nom, extra = {}) => ({
  insee: N[nom].insee, objet: { type: 'attestation' },
  declarations: [{ type: 'dep', valeur: N[nom].dep }], pieces: [], montant: null,
  registre: { insee: N[nom].insee }, ...extra,
});
const OUEST = { regions: SECTIONS.OUEST.regions, decrets: [] };

test('précédence : transférer > refuser > rectifier > accepter', () => {
  assert.equal(decider(base('Rennes'), OUEST).decision, 'ACCEPTER');
  assert.equal(decider(base('Rennes', { declarations: [{ type: 'dep', valeur: '29' }] }), OUEST).decision, 'RECTIFIER');
  assert.equal(decider(base('Rennes', { objet: { type: 'rattachement', dep: '13' } }), OUEST).decision, 'REFUSER');
  const lyon = decider(base('Lyon', { objet: { type: 'rattachement', dep: '13' } }), OUEST);
  assert.equal(lyon.decision, 'TRANSFERER');
  assert.equal(lyon.destination, '84');
});

test('registre falsifié détectable uniquement', () => {
  const ok = base('Rennes', { registre: { insee: '29238' } });
  assert.deepEqual(valider(ok), []);
  assert.equal(decider(ok, OUEST).decision, 'REFUSER');
  assert.ok(decider(ok, OUEST).anomalies.has('registre'));
  assert.ok(valider(base('Rennes', { registre: { insee: '35999' } })).length > 0);
});

test('décrets', () => {
  const ctx = { regions: OUEST.regions, decrets: [{ type: 'seuil_piece', seuil: 50000, piece: 'attestation_maire' }] };
  const d = base('Saint-Malo', {
    objet: { type: 'aide_littoral' }, montant: 60000,
    declarations: [{ type: 'dep', valeur: '35' }, { type: 'littoral', valeur: true }],
  });
  assert.equal(decider(d, ctx).decision, 'REFUSER');
  assert.equal(decider({ ...d, pieces: ['attestation_maire'] }, ctx).decision, 'ACCEPTER');
});

test('notation', () => {
  const ref = decider(base('Rennes', { declarations: [{ type: 'dep', valeur: '29' }] }), OUEST);
  assert.deepEqual(noter(ref, { decision: 'RECTIFIER', signalements: new Set(['d0']) }), { bonne: true, justification: true, points: 15 });
  assert.equal(noter(ref, { decision: 'RECTIFIER', signalements: new Set() }).points, 10);
  assert.equal(noter(ref, { decision: 'ACCEPTER', signalements: new Set() }).points, 0);
});
