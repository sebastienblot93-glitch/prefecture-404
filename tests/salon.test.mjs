import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Salon } from '../server/salon.mjs';
import { creerServeur } from '../server/serveur.mjs';
import { creerHasard } from '../src/moteur/hasard.js';
import { genererAppel } from '../src/moteur/telephone.js';
import { decider } from '../src/moteur/regles.js';

function salonDe(n, horloge = { t: 0 }) {
  const s = new Salon('TEST', () => horloge.t);
  const js = Array.from({ length: n }, (_, i) => s.rejoindre(`J${i + 1}`));
  js.forEach((j) => s.connexion(j, true));
  return { s, js, horloge };
}
const poste = (s, j) => s.posteDe(j.id);
const au = (s, js, p) => js.find((j) => s.posteDe(j.id) === p);

test('salle d\'attente : hôte, limite de 3, pseudos uniques', () => {
  const { s, js } = salonDe(3);
  assert.equal(s.hoteId, js[0].id);
  assert.throws(() => s.rejoindre('X'), /complet/);
  assert.throws(() => s.agir(js[1], { type: 'demarrer' }), /hôte/);
  const s2 = new Salon('AAAA');
  assert.notEqual(s2.rejoindre('Paul').pseudo, s2.rejoindre('paul').pseudo);
});

test('chaque poste ne voit que sa part du dossier', () => {
  const { s, js } = salonDe(3);
  s.agir(js[0], { type: 'demarrer' });
  s.agir(js[0], { type: 'commencer' });
  const g = s.vuePour(au(s, js, 'guichet').id).partie.bureau;
  const geo = s.vuePour(au(s, js, 'geographe').id).partie.bureau;
  const ins = s.vuePour(au(s, js, 'inspecteur').id).partie.bureau;
  assert.ok(g.commune && g.objet && g.condition);
  assert.equal(g.declarations, undefined);
  assert.equal(g.registre, undefined);
  assert.ok(geo.declarations.length >= 2);
  assert.equal(geo.commune, undefined);
  assert.ok(ins.registre && ins.reglement);
  assert.equal(ins.commune, undefined);
  assert.equal(ins.declarations, undefined);
});

test('à deux, le guichet récupère registre et règlement', () => {
  const { s, js } = salonDe(2);
  s.agir(js[0], { type: 'demarrer' });
  s.agir(js[0], { type: 'commencer' });
  const g = s.vuePour(au(s, js, 'guichet').id).partie.bureau;
  assert.ok(g.commune && g.registre && g.reglement);
});

test('seuls les bons postes peuvent agir', () => {
  const { s, js } = salonDe(3);
  s.agir(js[0], { type: 'demarrer' });
  s.agir(js[0], { type: 'commencer' });
  assert.throws(() => s.agir(au(s, js, 'geographe'), { type: 'tamponner', decision: 'ACCEPTER' }), /guichet/);
  assert.throws(() => s.agir(au(s, js, 'guichet'), { type: 'signaler', cible: 'd0' }), /géographe/);
  assert.throws(() => s.agir(au(s, js, 'guichet'), { type: 'signaler-piece', cible: 'registre' }), /bureau/);
});

test('opposition de l\'inspecteur, puis validation automatique après 4 s', () => {
  const { s, js, horloge } = salonDe(3);
  s.agir(js[0], { type: 'demarrer' });
  s.agir(js[0], { type: 'commencer' });
  const g = au(s, js, 'guichet');
  s.agir(g, { type: 'tamponner', decision: 'REFUSER' });
  assert.equal(s.partie.etape, 'validation');
  s.agir(au(s, js, 'inspecteur'), { type: 'opposition' });
  assert.equal(s.partie.etape, 'examen');
  assert.equal(s.partie.oppositions, 1);
  s.agir(g, { type: 'tamponner', decision: 'ACCEPTER' });
  horloge.t += 4100;
  s.tic();
  assert.equal(s.partie.etape, 'correction');
  assert.equal(s.partie.resultats.length, 1);
});

test('partie complète à deux avec les bonnes réponses : 8 × 15 points', () => {
  const { s, js, horloge } = salonDe(2);
  s.agir(js[0], { type: 'config', partie: '1', rotation: 1 });
  s.agir(js[0], { type: 'demarrer' });
  s.agir(js[1], { type: 'commencer' });
  const postes = [];
  for (let i = 0; i < 8; i++) {
    postes.push(poste(s, js[0]));
    const d = s.dossier();
    const ref = decider(d, s.partie.contexte);
    for (const k of ref.anomalies) {
      const qui = k.startsWith('d') ? au(s, js, 'geographe') : au(s, js, 'guichet');
      s.agir(qui, { type: k.startsWith('d') ? 'signaler' : 'signaler-piece', cible: k });
    }
    s.agir(au(s, js, 'guichet'), { type: 'tamponner', decision: ref.decision, destination: ref.destination });
    assert.equal(s.partie.correction.bonne, true, d.id);
    horloge.t += 1000;
    s.agir(js[0], { type: 'suivant' });
  }
  assert.equal(s.phase, 'bilan');
  assert.equal(s.partie.score, 120);
  assert.deepEqual(postes.slice(0, 4), ['guichet', 'geographe', 'guichet', 'geographe'], 'rotation à chaque dossier');
});

test('téléphone : sonne chez le géographe, réponse notée, appel manqué pénalisé', () => {
  const { s, js, horloge } = salonDe(2);
  s.agir(js[0], { type: 'demarrer' });
  s.agir(js[0], { type: 'commencer' });
  for (let i = 0; i < 50 && !s.partie.appel; i++) { horloge.t += 1000; s.tic(); }
  const geo = au(s, js, 'geographe');
  assert.ok(s.vuePour(geo.id).partie.bureau.appel, 'un appel doit arriver');
  assert.equal(s.vuePour(au(s, js, 'guichet').id).partie.bureau.appel, undefined);
  const bonne = s.partie.appel.reponse;
  s.agir(geo, { type: 'repondre', oui: bonne });
  assert.equal(s.partie.score, 3);
  for (let i = 0; i < 80 && !s.partie.appel; i++) { horloge.t += 1000; s.tic(); }
  horloge.t += 16000; s.tic();
  assert.equal(s.partie.appels.rates, 1);
  assert.equal(s.partie.credibilite, 95);
});

test('2 000 appels téléphoniques : tous certains, oui et non équilibrés', () => {
  let oui = 0;
  for (let g = 0; g < 2000; g++) if (genererAppel(creerHasard(`t${g}`)).reponse) oui++;
  assert.ok(oui > 600 && oui < 1400, `oui=${oui}`);
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
    const lire = async () => {
      let tampon = '';
      for (;;) {
        const { value } = await lecteur.read();
        tampon += new TextDecoder().decode(value);
        const m = tampon.match(/data: (.*)\n\n/);
        if (m) return JSON.parse(m[1]);
      }
    };
    const etat = await lire();
    assert.equal(etat.code, a.code);
    assert.equal(etat.joueurs.length, 2);
    assert.equal(etat.hote, true);
    const flux2 = await fetch(`${base}/api/salons/${a.code}/flux?jeton=${b.jeton}`);
    const refus = await post(`/api/salons/${a.code}/action`, { jeton: b.jeton, type: 'demarrer' });
    assert.equal(refus.status, 400);
    assert.match((await refus.json()).erreur, /hôte/);
    assert.equal((await post(`/api/salons/${a.code}/action`, { jeton: a.jeton, type: 'demarrer' })).status, 200);
    ctrl.abort();
    await flux2.body.cancel();
  } finally {
    serveur.closeAllConnections?.();
    await new Promise((ok) => serveur.close(ok));
  }
});
