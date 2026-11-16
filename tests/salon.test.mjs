import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Salon, repartir } from '../server/salon.mjs';
import { creerServeur } from '../server/serveur.mjs';
import { creerHasard } from '../src/moteur/hasard.js';
import { genererAppel } from '../src/moteur/telephone.js';
import { CULTURE } from '../src/data/culture.js';
import { decider } from '../src/moteur/regles.js';
import { ongletsUtiles, texteLigne, CLES_ONGLETS } from '../src/moteur/atlas-donnees.js';
import { JOURNEES } from '../src/campagne/journees.js';

function salonDe(n, horloge = { t: 0 }) {
  const s = new Salon('TEST', () => horloge.t);
  const js = Array.from({ length: n }, (_, i) => s.rejoindre(`J${i + 1}`));
  js.forEach((j) => s.connexion(j, true));
  return { s, js, horloge };
}
function partie(n) {
  const r = salonDe(n);
  r.s.agir(r.js[0], { type: 'demarrer' });
  r.s.agir(r.js[0], { type: 'commencer' });
  return r;
}

test("salle d'attente : hôte, couleurs, limite de 3", () => {
  const { s, js } = salonDe(3);
  assert.equal(s.hoteId, js[0].id);
  assert.deepEqual(js.map((j) => j.couleur), ['bleu', 'vert', 'violet']);
  assert.throws(() => s.rejoindre('X'), /complet/);
  assert.throws(() => s.agir(js[1], { type: 'demarrer' }), /hôte/);
});

test('répartition : tous les onglets distribués, un maximum de joueurs utiles, communes et départements séparés', () => {
  const tous = JOURNEES.flatMap((j) => j.dossiers);
  for (const n of [2, 3]) {
    const equipe = Array.from({ length: n }, (_, i) => `j${i}`);
    for (const [k, d] of tous.entries()) {
      const r = repartir(d, equipe, creerHasard(`r${n}-${k}`));
      const donnes = Object.values(r).flat().sort();
      assert.deepEqual(donnes, [...CLES_ONGLETS].sort());
      const utiles = ongletsUtiles(d);
      const servis = equipe.filter((id) => r[id].some((o) => utiles.has(o))).length;
      assert.ok(servis >= Math.min(n, utiles.size), `${d.id} : ${servis} joueur(s) avec un onglet utile`);
      const proprio = (o) => equipe.find((id) => r[id].includes(o));
      assert.notEqual(proprio('communes'), proprio('departements'), d.id);
    }
  }
});

test('écran partagé : tout le monde voit le même dossier, seuls les onglets diffèrent', () => {
  const { s, js } = partie(2);
  const [a, b] = js.map((j) => s.vuePour(j.id).partie);
  assert.deepEqual(a.dossier, b.dossier);
  assert.ok(a.dossier.commune && a.dossier.declarations.length && a.dossier.registre);
  assert.equal(a.mesOnglets.length, 3);
  assert.equal(b.mesOnglets.length, 3);
  assert.equal(a.mesOnglets.filter((o) => b.mesOnglets.includes(o)).length, 0);
});

test('signalements en direct, avec la couleur de leur auteur', () => {
  const { s, js } = partie(2);
  s.agir(js[1], { type: 'signaler', cible: 'd0' });
  assert.equal(s.vuePour(js[0].id).partie.dossier.declarations[0].signale, 'vert');
  s.agir(js[0], { type: 'signaler', cible: 'd0' });
  assert.equal(s.vuePour(js[1].id).partie.dossier.declarations[0].signale, null);
});

test('épingles : seulement depuis ses propres onglets, texte reconstruit par le serveur', () => {
  const { s, js } = partie(2);
  const mien = s.partie.repartition[js[0].id];
  const pasMien = s.partie.repartition[js[1].id];
  const insee = s.dossier().insee;
  const ongletCommune = mien.includes('communes') ? js[0] : js[1];
  s.agir(ongletCommune, { type: 'epingler', onglet: 'communes', cle: insee });
  const e = s.vuePour(js[0].id).partie.epingles;
  assert.equal(e.length, 1);
  assert.equal(e[0].texte, texteLigne('communes', insee));
  assert.throws(() => s.agir(js[0], { type: 'epingler', onglet: pasMien[0], cle: 'x' }), /pas dans votre atlas/);
  assert.throws(() => s.agir(js[0], { type: 'epingler', onglet: mien[0], cle: 'inexistant' }), /introuvable/);
  s.agir(js[1], { type: 'depingler', id: e[0].id });
  assert.equal(s.vuePour(js[0].id).partie.epingles.length, 0);
});

test('double signature : proposer, contester, contresigner', () => {
  const { s, js } = partie(2);
  s.agir(js[0], { type: 'proposer', decision: 'ACCEPTER' });
  assert.throws(() => s.agir(js[0], { type: 'contresigner' }), /collègue/);
  assert.equal(s.vuePour(js[1].id).partie.proposition.pseudo, 'J1');
  s.agir(js[1], { type: 'contester' });
  assert.equal(s.partie.proposition, null);
  assert.equal(s.partie.contestations, 1);
  s.agir(js[1], { type: 'proposer', decision: 'REFUSER' });
  s.agir(js[0], { type: 'contresigner' });
  assert.equal(s.partie.etape, 'correction');
  assert.deepEqual(s.partie.correction.signataires, ['J2', 'J1']);
});

test('partie complète à deux, bonnes réponses : 8 × 15 points', () => {
  const { s, js, horloge } = salonDe(2);
  s.agir(js[0], { type: 'config', partie: '1' });
  s.agir(js[0], { type: 'demarrer' });
  s.agir(js[1], { type: 'commencer' });
  for (let i = 0; i < 8; i++) {
    const ref = decider(s.dossier(), s.partie.contexte);
    for (const k of ref.anomalies) s.agir(js[i % 2], { type: 'signaler', cible: k });
    s.agir(js[i % 2], { type: 'proposer', decision: ref.decision, destination: ref.destination });
    s.agir(js[(i + 1) % 2], { type: 'contresigner' });
    assert.equal(s.partie.correction.bonne, true);
    horloge.t += 1000;
    s.agir(js[0], { type: 'suivant' });
  }
  assert.equal(s.phase, 'bilan');
  assert.equal(s.partie.score, 120);
});

test('téléphone bonus : visible par tous, bonne réponse +5, raté ou ignoré sans pénalité', () => {
  const { s, js, horloge } = partie(2);
  const sonner = () => { for (let i = 0; i < 80 && !s.partie.appel; i++) { horloge.t += 1000; s.tic(); } };
  sonner();
  assert.ok(s.vuePour(js[0].id).partie.appel && s.vuePour(js[1].id).partie.appel);
  s.agir(js[1], { type: 'repondre', choix: s.partie.appel.bonne });
  assert.equal(s.partie.score, 5);
  sonner();
  s.agir(js[0], { type: 'repondre', choix: (s.partie.appel.bonne + 1) % 3 });
  sonner();
  horloge.t += 21000; s.tic();
  assert.deepEqual(s.partie.appels, { bons: 1, faux: 1, ignores: 1 });
  assert.equal(s.partie.credibilite, 100);
  assert.equal(s.partie.score, 5);
});

test("pause : réservée à l'hôte, gèle le chronomètre, le téléphone et les actions", () => {
  const { s, js, horloge } = partie(2);
  assert.throws(() => s.agir(js[1], { type: 'pause' }), /hôte/);
  horloge.t += 5000; s.tic();
  const avant = s.partie.ecoule;
  s.agir(js[0], { type: 'pause' });
  assert.equal(s.vuePour(js[1].id).partie.pause.par, 'J1');
  horloge.t += 120000; s.tic();
  assert.equal(s.partie.ecoule, avant, 'le temps ne doit pas avancer');
  assert.equal(s.partie.appel, null, 'le téléphone ne sonne pas en pause');
  assert.throws(() => s.agir(js[1], { type: 'signaler', cible: 'd0' }), /pause/);
  assert.throws(() => s.agir(js[0], { type: 'proposer', decision: 'ACCEPTER' }), /pause/);
  assert.throws(() => s.agir(js[1], { type: 'pause' }), /hôte/);
  s.agir(js[0], { type: 'pause' });
  assert.equal(s.vuePour(js[1].id).partie.pause, null);
  horloge.t += 1000; s.tic();
  assert.equal(s.partie.ecoule, avant + 1000, 'le temps repart sans compter la pause');
  s.agir(js[1], { type: 'signaler', cible: 'd0' });
});

test('banque de culture : 3 choix distincts, bonne réponse retrouvée, pas de répétition', () => {
  for (const q of CULTURE) assert.equal(new Set([q.bonne, ...q.faux]).size, 3, q.question);
  const h = creerHasard('quiz');
  const deja = new Set();
  for (let i = 0; i < CULTURE.length; i++) {
    const a = genererAppel(h, deja);
    assert.ok(!deja.has(a.numero));
    deja.add(a.numero);
    assert.equal(a.choix[a.bonne], CULTURE[a.numero].bonne);
  }
});

test('serveur HTTP : créer, rejoindre, flux, action, fichiers protégés', async () => {
  const serveur = creerServeur();
  await new Promise((ok) => serveur.listen(0, ok));
  const base = `http://127.0.0.1:${serveur.address().port}`;
  const post = (u, b) => fetch(base + u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
  try {
    assert.equal((await fetch(`${base}/api/sante`)).status, 200);
    assert.equal((await fetch(`${base}/index.html`)).status, 200);
    assert.equal((await fetch(`${base}/server/salon.mjs`)).status, 404);
    assert.equal((await fetch(`${base}/..%2Fpackage.json`)).status, 404);
    const a = await (await post('/api/salons', { pseudo: 'Ana' })).json();
    assert.match(a.code, /^[A-Z]{4}$/);
    const b = await (await post(`/api/salons/${a.code}/rejoindre`, { pseudo: 'Bob' })).json();
    assert.equal((await post('/api/salons/ZZZZ/rejoindre', {})).status, 404);

    const ctrl = new AbortController();
    const r = await fetch(`${base}/api/salons/${a.code}/flux?jeton=${a.jeton}`, { signal: ctrl.signal });
    const lecteur = r.body.getReader();
    let tampon = '';
    let etat;
    while (!etat) {
      const { value } = await lecteur.read();
      tampon += new TextDecoder().decode(value);
      const m = tampon.match(/data: (.*)\n\n/);
      if (m) etat = JSON.parse(m[1]);
    }
    assert.equal(etat.code, a.code);
    assert.equal(etat.joueurs.length, 2);
    const flux2 = await fetch(`${base}/api/salons/${a.code}/flux?jeton=${b.jeton}`);
    const refus = await post(`/api/salons/${a.code}/action`, { jeton: b.jeton, type: 'demarrer' });
    assert.equal(refus.status, 400);
    assert.equal((await post(`/api/salons/${a.code}/action`, { jeton: a.jeton, type: 'demarrer' })).status, 200);
    ctrl.abort();
    await flux2.body.cancel();
  } finally {
    serveur.closeAllConnections?.();
    await new Promise((ok) => serveur.close(ok));
  }
});
