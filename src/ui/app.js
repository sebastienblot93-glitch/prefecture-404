import { REGIONS } from '../data/territoires.js';
import { COMMUNE_PAR_INSEE } from '../data/communes.js';
import { libelleDeclaration } from '../moteur/verite.js';
import { OBJETS, PIECES, SECTIONS, LIBELLE_DECISION, decider, noter } from '../moteur/regles.js';
import { creerHasard } from '../moteur/hasard.js';
import { genererDossier } from '../moteur/generateur.js';
import { AGRAFE } from '../moteur/folklore.js';
import { conseilErreur } from '../moteur/pedagogie.js';
import { JOURNEES, contexteDe } from '../campagne/journees.js';
import { contexteInfini, nouvelleGraine } from '../campagne/infini.js';
import { monterAtlas } from './atlas.js';
import { htmlReglement } from './reglement.js';
import { initEnLigne } from './accueil-en-ligne.js';
import { sonTampon, sonPapier, sonErreur, basculerMuet, estMuet } from './son.js';

window.__p404 = true;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const euros = (n) => `${n.toLocaleString('fr-FR')} €`;
const hasard = (l) => l[Math.floor(Math.random() * l.length)];

// ——— Carrière (stockage local, facultatif)
const GRADES = [
  [0, 'Stagiaire'], [150, 'Agent territorial'], [400, 'Responsable des trombones'],
  [800, 'Chef de bureau'], [1500, 'Directeur du tampon national'],
];
const gradeDe = (p) => GRADES.filter(([s]) => p >= s).at(-1)[1];
const prochainGrade = (p) => GRADES.find(([s]) => s > p);
function lireCarriere() {
  try { return JSON.parse(localStorage.getItem('p404-carriere')) ?? { points: 0, meilleurs: {}, infini: 0 }; }
  catch { return { points: 0, meilleurs: {}, infini: 0 }; }
}
function ecrireCarriere(c) { try { localStorage.setItem('p404-carriere', JSON.stringify(c)); } catch { /* ignoré */ } }

// ——— État de partie
let P = null;
let minuterie = null;

function afficherEcran(id) {
  $$('.ecran').forEach((e) => { e.hidden = e.id !== id; });
  window.scrollTo(0, 0);
}

// ——————————————————————————————— Accueil
function rendreAccueil() {
  const car = lireCarriere();
  $('#grade').textContent = gradeDe(car.points);
  const pg = prochainGrade(car.points);
  $('#grade-suite').textContent = pg
    ? `${car.points} points de carrière. Prochaine promotion à ${pg[0]} : ${pg[1]}.`
    : `${car.points} points de carrière. Sommet de la hiérarchie atteint.`;
  $('#liste-journees').innerHTML = JOURNEES.map((j) => {
    const m = car.meilleurs[j.id];
    return `<li><button class="btn-journee" data-jour="${j.id}">
      <span class="j-titre">${esc(j.titre)}</span>
      <span class="j-meta">${SECTIONS[j.section].nom}, ${j.dossiers.length} dossiers${m !== undefined ? `. Meilleur score : ${m}` : ''}</span>
    </button></li>`;
  }).join('');
  $$('.btn-journee').forEach((b) => b.addEventListener('click', () => lancerCampagne(+b.dataset.jour)));
  $('#record-infini').textContent = car.infini ? `Record : ${car.infini} dossiers traités.` : '';
}

// ——————————————————————————————— Lancement
function lancerCampagne(id) {
  const j = JOURNEES.find((x) => x.id === id);
  demarrer({
    mode: 'campagne', journee: j, contexte: contexteDe(j),
    dossiers: j.dossiers, duree: j.duree,
    titre: j.titre, intro: j.intro,
  });
}

function lancerInfini() {
  let graine = $('#graine').value.trim().toUpperCase();
  if (!graine) { graine = nouvelleGraine(); $('#graine').value = graine; }
  const ctx = contexteInfini(graine);
  const h = creerHasard(`dossiers-${graine}`);
  demarrer({
    mode: 'infini', graine, contexte: ctx, hasard: h, dossiers: [],
    titre: `Mode infini — graine ${graine}`,
    intro: `L'administration est en surchauffe. Les dossiers arrivent sans cesse et le rythme s'accélère. Chaque erreur coûte de la crédibilité. Tenez le plus longtemps possible. ${SECTIONS[ctx.section].nom}.`,
  });
}

function demarrer(cfg) {
  P = {
    ...cfg, index: 0, score: 0, credibilite: 100, resultats: [],
    ecoule: 0, enPause: true, signalements: new Set(), tamponne: false,
    arrives: 1, prochaineArrivee: 40, intervalle: 40,
  };
  if (P.mode === 'infini') P.dossiers.push(genererDossier(P.hasard, P.contexte, 3, 1));
  $('#b-journee').textContent = P.titre;
  $('#b-guichet').textContent = `Guichet 404, ${SECTIONS[P.contexte.section].nom}`;
  $('#reglement').innerHTML = htmlReglement(P.contexte);
  $('#file').hidden = P.mode !== 'infini';
  afficherEcran('ecran-bureau');
  majBandeau();
  afficherNote({
    titre: 'Note de service',
    corps: `<p>${esc(P.intro)}</p><p class="note-coop">Cliquez sur une ligne du dossier pour la signaler comme anomalie, puis posez un tampon. Signaler juste rapporte un bonus.</p>`,
    bouton: 'Ouvrir le guichet',
    action: () => { cacherNote(); afficherDossier(); },
  });
  clearInterval(minuterie);
  minuterie = setInterval(tic, 250);
}

// ——————————————————————————————— Temps
function tic() {
  if (!P || P.enPause) return;
  P.ecoule += 0.25;
  if (P.mode === 'campagne' && P.ecoule >= P.duree) return finJournee('retard');
  if (P.mode === 'infini') {
    P.prochaineArrivee -= 0.25;
    if (P.prochaineArrivee <= 0) {
      P.arrives++;
      P.dossiers.push(genererDossier(P.hasard, P.contexte, 3, P.arrives));
      P.prochaineArrivee = P.intervalle;
      if (P.arrives - P.index > 6) {
        P.credibilite -= 10;
        flash('La file déborde : crédibilité −10');
        if (P.credibilite <= 0) return finJournee('credibilite');
      }
    }
  }
  majBandeau();
}

function majBandeau() {
  if (P.mode === 'campagne') {
    const minutes = 9 * 60 + Math.min(1, P.ecoule / P.duree) * 8 * 60;
    $('#horloge').textContent = `${String(Math.floor(minutes / 60)).padStart(2, '0')} h ${String(Math.floor(minutes % 60)).padStart(2, '0')}`;
    $('#horloge').classList.toggle('tard', P.ecoule / P.duree > 0.8);
  } else {
    const s = Math.floor(P.ecoule);
    $('#horloge').textContent = `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`;
    $('#file').textContent = `En attente : ${Math.max(0, P.arrives - P.index - 1)}`;
  }
  $('#score').textContent = `${P.score} pts`;
  const cr = Math.max(0, P.credibilite);
  $('#credibilite').style.setProperty('--niveau', `${cr}%`);
  $('#credibilite').setAttribute('aria-valuenow', cr);
  $('#credibilite').classList.toggle('basse', cr <= 40);
}

// ——————————————————————————————— Dossier
function afficherDossier() {
  const d = P.dossiers[P.index];
  const c = COMMUNE_PAR_INSEE[d.insee];
  const o = OBJETS[d.objet.type];
  P.signalements = new Set();
  P.tamponne = false;
  P.enPause = false;
  const total = P.mode === 'campagne' ? ` sur ${P.dossiers.length}` : '';

  $('#dossier').innerHTML = `
    ${d.conseil ? `<aside class="postit" role="note"><span class="postit-de">Note du chef de bureau</span>${esc(d.conseil)}</aside>` : ''}
    <article class="formulaire" aria-label="Dossier ${esc(d.id)}">
      <header class="f-entete">
        <div><span class="f-ref">Formulaire 404-B</span><span class="f-titre">Demande d'une collectivité territoriale</span></div>
        <div class="f-num">Dossier ${P.index + 1}${total}<br><span>Réf. ${esc(d.id)}</span></div>
      </header>
      <div class="f-champ f-commune"><span class="f-label">Commune</span><span class="f-val">${esc(c.nom)}</span></div>
      <div class="f-champ"><span class="f-label">Objet de la demande</span><span class="f-val">${esc(o.libelle(d.objet))}</span></div>
      <div class="f-champ f-condition"><span class="f-label">Condition d'éligibilité</span><span class="f-val">${esc(o.condition(d.objet))}</span></div>
      ${d.montant !== null ? `<div class="f-champ"><span class="f-label">Montant sollicité</span><span class="f-val">${euros(d.montant)}</span></div>` : ''}
      <div class="f-champ"><span class="f-label">Demandeur</span><span class="f-val">${esc(d.demandeur)}</span></div>
      <fieldset class="f-decl">
        <legend>Déclarations de la commune</legend>
        ${d.declarations.map((x, i) => {
          const [lab, val] = libelleDeclaration(x);
          return `<button type="button" class="signalable decl" data-cible="d${i}" aria-pressed="false">
            <span class="f-label">${esc(lab)}</span><span class="f-val">${esc(val)}</span></button>`;
        }).join('')}
      </fieldset>
      <button type="button" class="signalable f-pieces" data-cible="pieces" aria-pressed="false">
        <span class="f-label">Pièces jointes</span>
        <span class="f-val">${d.pieces.length ? d.pieces.map((p) => esc(PIECES[p])).join(' ; ') : 'Aucune'}</span>
      </button>
      <p class="f-mot">« ${esc(d.mot)} »</p>
    </article>
    <aside class="registre">
      <button type="button" class="signalable reg-corps" data-cible="registre" aria-pressed="false">
        <span class="reg-titre">Extrait du registre national des communes</span>
        <span class="reg-ligne"><span class="f-label">Nom</span><span class="f-val">${esc(c.nom.toUpperCase())}</span></span>
        <span class="reg-ligne"><span class="f-label">Code INSEE</span><span class="f-val reg-code">${esc(d.registre.insee)}</span></span>
        <span class="reg-copie">Copie certifiée conforme</span>
      </button>
    </aside>
    <div class="empreinte" hidden></div>`;
  $$('#dossier .signalable').forEach((b) => b.addEventListener('click', () => basculerSignalement(b)));
  $('#dossier').classList.remove('arrive');
  void $('#dossier').offsetWidth;
  $('#dossier').classList.add('arrive');
  $$('.tampon').forEach((t) => { t.disabled = false; });
  sonPapier();
  majBandeau();
}

function basculerSignalement(b) {
  if (P.tamponne) return;
  const k = b.dataset.cible;
  if (P.signalements.has(k)) P.signalements.delete(k); else P.signalements.add(k);
  b.setAttribute('aria-pressed', P.signalements.has(k));
}

// ——————————————————————————————— Tampons
function poserTampon(decision, destination = null) {
  if (!P || P.tamponne || P.enPause) return;
  P.tamponne = true;
  P.enPause = true;
  $$('.tampon').forEach((t) => { t.disabled = true; });
  fermerChoixRegion();

  const d = P.dossiers[P.index];
  const ref = decider(d, P.contexte);
  const note = noter(ref, { decision, destination, signalements: P.signalements });
  P.score += note.points;
  const penalite = d.conseil ? 0 : P.mode === 'campagne' ? 12 : 20; // dossiers d'apprentissage : sans pénalité
  if (!note.bonne) P.credibilite -= penalite;
  P.dernierePenalite = penalite;
  P.resultats.push({ d, ref, decision, destination, note });

  const emp = $('#dossier .empreinte');
  emp.className = `empreinte encre-${decision}`;
  emp.innerHTML = `<span class="emp-mot">${LIBELLE_DECISION[decision]}</span>
    <span class="emp-sous">${destination ? `vers ${esc(REGIONS[destination])}` : 'Guichet 404'}</span>`;
  emp.hidden = false;
  $('#dossier').classList.add('frappe');
  setTimeout(() => $('#dossier').classList.remove('frappe'), 260);
  sonTampon();
  if (!note.bonne) setTimeout(sonErreur, 280);
  majBandeau();

  setTimeout(() => afficherCorrection(ref, decision, destination, note), 650);
}

function afficherCorrection(ref, decision, destination, note) {
  const c = COMMUNE_PAR_INSEE[P.dossiers[P.index].insee];
  const comm = note.bonne ? hasard(note.justification ? AGRAFE.bravo : AGRAFE.bravoSansJustif) : hasard(AGRAFE.erreur);
  const attendu = ref.decision === 'TRANSFERER'
    ? `${LIBELLE_DECISION.TRANSFERER} vers ${REGIONS[ref.destination]}` : LIBELLE_DECISION[ref.decision];
  const vous = destination ? `${LIBELLE_DECISION[decision]} vers ${REGIONS[destination]}` : LIBELLE_DECISION[decision];
  let justif = '';
  if (note.bonne && ref.decision !== 'TRANSFERER')
    justif = note.justification
      ? '<p class="c-justif ok">Anomalies correctement signalées : bonus de justification.</p>'
      : `<p class="c-justif">Signalements inexacts : ${ref.anomalies.size ? `il fallait signaler ${ref.anomalies.size} élément${ref.anomalies.size > 1 ? 's' : ''}` : 'il n\'y avait rien à signaler'}.</p>`;
  if (note.bonne && ref.decision === 'TRANSFERER' && !note.justification)
    justif = `<p class="c-justif">Mauvaise destination : la commune relève de ${REGIONS[ref.destination]}.</p>`;
  const lignes = [...ref.explications, ...ref.motifs];
  const lecon = conseilErreur(P.dossiers[P.index], ref, decision);
  const fin = P.mode === 'campagne' ? P.index + 1 >= P.dossiers.length : P.credibilite <= 0;

  // Les anomalies réelles apparaissent sur le dossier
  ref.anomalies.forEach((k) => $(`#dossier [data-cible="${k}"]`)?.classList.add('anomalie-reelle'));

  afficherNote({
    classe: note.bonne ? 'note-ok' : 'note-ko',
    lateral: true,
    titre: note.bonne ? `Bonne décision, +${note.points} points`
      : P.dernierePenalite ? `Décision erronée, crédibilité −${P.dernierePenalite}` : "Décision erronée (période d'essai : sans pénalité)",
    mascotte: comm,
    corps: `
      ${note.bonne ? '' : `<p class="c-compare">Vous : <strong>${esc(vous)}</strong>. Attendu : <strong>${esc(attendu)}</strong>.</p>`}
      ${lecon ? `<p class="c-lecon">${esc(lecon)}</p>` : ''}
      ${justif}
      <ul class="c-expl">${lignes.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      ${c.note && (!note.bonne || ref.anomalies.size) ? `<p class="c-savoir">Le saviez-vous ? ${esc(c.note)}</p>` : ''}`,
    bouton: fin ? 'Voir le bilan' : 'Dossier suivant',
    action: () => {
      cacherNote();
      if (P.mode === 'infini') {
        P.intervalle = Math.max(15, P.intervalle - 1.5);
        if (P.credibilite <= 0) return finJournee('credibilite');
      }
      P.index++;
      if (P.mode === 'campagne' && P.index >= P.dossiers.length) return finJournee('fini');
      if (P.mode === 'infini' && P.index >= P.dossiers.length) {
        P.arrives++;
        P.dossiers.push(genererDossier(P.hasard, P.contexte, 3, P.arrives));
        P.prochaineArrivee = P.intervalle;
      }
      afficherDossier();
    },
  });
}

// ——————————————————————————————— Transfert : choix de la région
function ouvrirChoixRegion() {
  if (!P || P.tamponne || P.enPause) return;
  const box = $('#choix-region');
  box.innerHTML = `<p class="cr-titre">Transférer vers…</p>
    <div class="cr-liste">${Object.entries(REGIONS).sort(([, a], [, b]) => a.localeCompare(b, 'fr'))
      .map(([code, nom]) => `<button type="button" data-region="${code}">${esc(nom)}</button>`).join('')}</div>
    <button type="button" class="cr-annuler">Annuler</button>`;
  box.hidden = false;
  $$('[data-region]', box).forEach((b) => b.addEventListener('click', () => poserTampon('TRANSFERER', b.dataset.region)));
  $('.cr-annuler', box).addEventListener('click', fermerChoixRegion);
  $('[data-region]', box).focus();
}
function fermerChoixRegion() { $('#choix-region').hidden = true; }

// ——————————————————————————————— Note de service (fenêtre)
let actionNote = null;
function afficherNote({ titre, corps, bouton, action, classe = '', mascotte = null, lateral = false }) {
  P && (P.enPause = true);
  const n = $('#note');
  n.className = `note ${classe}${lateral ? ' lateral' : ''}`;
  n.setAttribute('aria-modal', String(!lateral));
  $('#note-titre').textContent = titre;
  $('#note-corps').innerHTML = corps;
  $('#note-mascotte').hidden = !mascotte;
  $('#note-bulle').textContent = mascotte ?? '';
  $('#note-bouton').textContent = bouton;
  actionNote = action;
  n.hidden = false;
  $('#note-bouton').focus();
}
function cacherNote() { $('#note').hidden = true; actionNote = null; }

let flashT = null;
function flash(t) {
  const f = $('#flash');
  f.textContent = t; f.hidden = false;
  clearTimeout(flashT);
  flashT = setTimeout(() => { f.hidden = true; }, 2500);
}

// ——————————————————————————————— Bilan
function finJournee(raison) {
  clearInterval(minuterie);
  P.enPause = true;
  cacherNote();
  const traites = P.resultats.length;
  const bons = P.resultats.filter((r) => r.note.bonne).length;
  const nonTraites = P.mode === 'campagne' ? P.dossiers.length - traites : 0;
  const car = lireCarriere();
  const avant = gradeDe(car.points);
  car.points += Math.max(0, P.score);
  if (P.mode === 'campagne') car.meilleurs[P.journee.id] = Math.max(car.meilleurs[P.journee.id] ?? 0, P.score);
  else car.infini = Math.max(car.infini ?? 0, traites);
  ecrireCarriere(car);
  const apres = gradeDe(car.points);

  const titre = raison === 'credibilite'
    ? 'Mutation d\'office'
    : raison === 'retard' ? '17 h 00, le guichet ferme' : 'Fin de journée';
  const chapeau = raison === 'credibilite'
    ? "Votre crédibilité est épuisée. Le Bureau vous mute à l'antenne administrative de l'île de Clipperton (population : zéro, dossiers : nombreux)."
    : raison === 'retard' ? `${nonTraites} dossier${nonTraites > 1 ? 's' : ''} n'${nonTraites > 1 ? 'ont' : 'a'} pas été traité${nonTraites > 1 ? 's' : ''}.` : 'Tous les dossiers ont été traités.';

  $('#bilan').innerHTML = `
    <h2>${titre}</h2>
    <p class="bilan-chapeau">${esc(chapeau)}</p>
    <div class="bilan-chiffres">
      <p><span class="bc-n">${P.score}</span> points</p>
      <p><span class="bc-n">${bons}/${traites}</span> bonnes décisions</p>
      <p><span class="bc-n">${Math.max(0, P.credibilite)} %</span> de crédibilité</p>
    </div>
    ${apres !== avant ? `<p class="bilan-promo">Promotion : vous êtes désormais <strong>${esc(apres)}</strong>.</p>` : `<p class="bilan-grade">Grade : ${esc(apres)}</p>`}
    <table class="bilan-table">
      <thead><tr><th>Commune</th><th>Votre tampon</th><th>Attendu</th><th>Points</th></tr></thead>
      <tbody>${P.resultats.map((r) => `<tr class="${r.note.bonne ? '' : 'ko'}">
        <td>${esc(COMMUNE_PAR_INSEE[r.d.insee].nom)}</td>
        <td>${LIBELLE_DECISION[r.decision]}</td>
        <td>${LIBELLE_DECISION[r.ref.decision]}${r.ref.destination ? ` (${esc(REGIONS[r.ref.destination])})` : ''}</td>
        <td>${r.note.points}${r.note.justification ? ' ✓' : ''}</td></tr>`).join('')}</tbody>
    </table>
    <div class="bilan-actions">
      ${P.mode === 'campagne' && JOURNEES.find((j) => j.id === P.journee.id + 1)
        ? `<button class="btn-principal" id="bilan-suivant">${esc(JOURNEES.find((j) => j.id === P.journee.id + 1).titre)}</button>` : ''}
      <button class="btn" id="bilan-rejouer">Rejouer</button>
      <button class="btn" id="bilan-menu">Retour à l'accueil</button>
    </div>`;
  afficherEcran('ecran-bilan');
  $('#bilan-suivant')?.addEventListener('click', () => lancerCampagne(P.journee.id + 1));
  $('#bilan-rejouer').addEventListener('click', () => (P.mode === 'campagne' ? lancerCampagne(P.journee.id) : lancerInfini()));
  $('#bilan-menu').addEventListener('click', () => { rendreAccueil(); afficherEcran('ecran-accueil'); });
}

// ——————————————————————————————— Branchements
function init() {
  monterAtlas($('#atlas'));
  rendreAccueil();
  initEnLigne();
  $('#btn-infini').addEventListener('click', lancerInfini);
  $$('.tampon').forEach((t) => t.addEventListener('click', () =>
    (t.dataset.decision === 'TRANSFERER' ? ouvrirChoixRegion() : poserTampon(t.dataset.decision))));
  $('#note-bouton').addEventListener('click', () => actionNote?.());
  $('#btn-quitter').addEventListener('click', () => {
    clearInterval(minuterie); cacherNote(); fermerChoixRegion(); P = null;
    rendreAccueil(); afficherEcran('ecran-accueil');
  });
  const son = $('#btn-son');
  const majSon = () => { son.textContent = estMuet() ? 'Son coupé' : 'Son actif'; son.setAttribute('aria-pressed', !estMuet()); };
  son.addEventListener('click', () => { basculerMuet(); majSon(); });
  majSon();

  document.addEventListener('keydown', (e) => {
    if ($('#ecran-bureau').hidden || e.target.matches('input')) return;
    if (!$('#note').hidden) { if (e.key === 'Enter') { e.preventDefault(); actionNote?.(); } return; }
    if (e.key === 'Escape') return fermerChoixRegion();
    const t = { 1: 'ACCEPTER', 2: 'RECTIFIER', 3: 'TRANSFERER', 4: 'REFUSER' }[e.key];
    if (t) t === 'TRANSFERER' ? ouvrirChoixRegion() : poserTampon(t);
  });
}

init();
