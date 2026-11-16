// Client du jeu en ligne. Le serveur est l'arbitre : ce fichier ne fait
// qu'afficher l'état reçu (flux SSE) et envoyer les actions du joueur.
import { REGIONS } from '../data/territoires.js';
import { LIBELLE_DECISION } from '../moteur/regles.js';
import { monterAtlas } from './atlas.js';
import { htmlReglement } from './reglement.js';
import { sonTampon, sonPapier, sonErreur, sonTelephone, basculerMuet, estMuet } from './son.js';
import { lireJeton, ecrireJeton, lirePseudo, ecrirePseudo, appel } from './accueil-en-ligne.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const euros = (n) => `${Number(n).toLocaleString('fr-FR')} €`;
const NOM_POSTE = { guichet: 'Agent de guichet', geographe: 'Géographe', inspecteur: 'Inspecteur' };
const AIDE_POSTE = {
  guichet: "Vous voyez la commune et l'objet de la demande. Le géographe a les déclarations et l'atlas : faites-vous lire ce qu'il trouve, puis tamponnez.",
  geographe: "Vous voyez les déclarations, mais pas la commune : demandez-la au guichet. Vérifiez dans l'atlas, marquez les lignes fausses, et décrochez quand le téléphone sonne.",
  inspecteur: "Vous seul connaissez le règlement et les décrets. Contrôlez montant, pièces et registre. Quand le guichet tamponne, vous avez 4 secondes pour faire opposition.",
};

const code = (new URLSearchParams(location.search).get('code') ?? '').toUpperCase();
let jeton = lireJeton(code);
let etat = null;
let gabarit = '';
let source = null;
let echecs = 0;
const memo = { etape: null, appel: null, annonce: null };

function afficherEcran(id) { $$('.ecran').forEach((e) => { e.hidden = e.id !== id; }); }
function maj(el, html) { if (el && el.__html !== html) { el.innerHTML = html; el.__html = html; } }

async function agir(type, donnees = {}) {
  try { await appel(`api/salons/${code}/action`, { jeton, type, ...donnees }); }
  catch (e) { annoncer(e.message, 'ko'); }
}

let annonceLocale = null;
function annoncer(texte, ton) { annonceLocale = { texte, ton, t: Date.now() }; rendreAnnonce(); }
function rendreAnnonce() {
  const a = etat?.partie?.annonce;
  const loc = annonceLocale && Date.now() - annonceLocale.t < 5000 ? annonceLocale : null;
  const x = loc ?? a;
  const el = $('#j-annonce');
  el.hidden = !x;
  if (x) { el.textContent = x.texte; el.dataset.ton = x.ton ?? ''; }
}

// ——————————————————————————— Connexion
async function verifierAcces() {
  if (!/^[A-Z]{4}$/.test(code)) return 'absent';
  if (!jeton) return 'inconnu';
  const ctrl = new AbortController();
  try {
    const r = await fetch(`api/salons/${code}/flux?jeton=${encodeURIComponent(jeton)}`, { signal: ctrl.signal });
    ctrl.abort();
    if (r.status === 404) return 'absent';
    if (r.status === 403) return 'inconnu';
    return 'ok';
  } catch { return 'ok'; }
}

async function connecter() {
  const acces = await verifierAcces();
  if (acces === 'absent') return salonIntrouvable();
  if (acces === 'inconnu') return ecranRejoindre();
  source?.close();
  source = new EventSource(`api/salons/${code}/flux?jeton=${encodeURIComponent(jeton)}`);
  source.onopen = () => { echecs = 0; $('#connexion').hidden = true; };
  source.onmessage = (e) => { etat = JSON.parse(e.data); rendre(); };
  source.onerror = async () => {
    $('#connexion').hidden = false;
    if (++echecs >= 3) {
      const a = await verifierAcces();
      if (a !== 'ok') { source.close(); return a === 'absent' ? salonIntrouvable() : ecranRejoindre(); }
    }
  };
}

function salonIntrouvable() {
  afficherEcran('ecran-rejoindre');
  $('#rj-code').textContent = code || '?';
  $('#rj-pseudo').closest('label').hidden = true;
  $('#rj-bouton').hidden = true;
  $('#rj-erreur').hidden = false;
  $('#rj-erreur').textContent = "Ce salon n'existe pas ou a été fermé (les salons inactifs ferment au bout de 2 heures, et un redémarrage du serveur les efface). Créez-en un nouveau depuis l'accueil.";
}

function ecranRejoindre() {
  afficherEcran('ecran-rejoindre');
  $('#rj-code').textContent = code;
  $('#rj-pseudo').value = lirePseudo();
  const go = async () => {
    const pseudo = $('#rj-pseudo').value.trim();
    if (!pseudo) { $('#rj-erreur').hidden = false; $('#rj-erreur').textContent = 'Indiquez votre nom.'; return; }
    ecrirePseudo(pseudo);
    try {
      const r = await appel(`api/salons/${code}/rejoindre`, { pseudo });
      jeton = r.jeton; ecrireJeton(code, jeton); connecter();
    } catch (e) { $('#rj-erreur').hidden = false; $('#rj-erreur').textContent = e.message; }
  };
  $('#rj-bouton').onclick = go;
  $('#rj-pseudo').onkeydown = (e) => { if (e.key === 'Enter') go(); };
  $('#rj-pseudo').focus();
}

// ——————————————————————————— Rendu
function rendre() {
  if (!etat) return;
  if (etat.phase === 'attente') return rendreAttente();
  if (etat.phase === 'bilan') return rendreBilan();
  rendreJeu();
}

function rendreAttente() {
  afficherEcran('ecran-attente');
  gabarit = '';
  $('#at-code').textContent = etat.code;
  const lien = new URL(`salon.html?code=${etat.code}`, location.href).href;
  $('#at-lien').textContent = lien;
  $('#at-copier').onclick = async () => {
    try { await navigator.clipboard.writeText(lien); $('#at-copier').textContent = 'Copié'; } catch { /* sélection manuelle */ }
  };
  $('#at-nb').textContent = `(${etat.joueurs.length}/3)`;
  maj($('#at-joueurs'), etat.joueurs.map((j) => `<li class="${j.connecte ? 'en-ligne' : 'hors-ligne'}">
    <span class="pastille" aria-hidden="true"></span>${esc(j.pseudo)}${j.id === etat.hoteId ? ' <span class="discret">(hôte)</span>' : ''}${j.id === etat.moi.id ? ' <span class="discret">(vous)</span>' : ''}</li>`).join(''));

  const sel = $('#at-partie');
  if (!sel.options.length) {
    sel.innerHTML = etat.journees.map((j) => `<option value="${j.id}">${esc(j.titre)}</option>`).join('') + '<option value="infini">Mode infini</option>';
    sel.onchange = () => agir('config', { partie: sel.value });
    $('#at-rotation').onchange = () => agir('config', { rotation: Number($('#at-rotation').value) });
    $('#at-graine').onchange = () => agir('config', { graine: $('#at-graine').value });
    $('#at-lancer').onclick = async () => {
      $('#at-erreur').hidden = true;
      try { await appel(`api/salons/${code}/action`, { jeton, type: 'demarrer' }); }
      catch (e) { $('#at-erreur').hidden = false; $('#at-erreur').textContent = e.message; }
    };
  }
  const c = etat.config;
  if (document.activeElement !== sel) sel.value = c.partie;
  if (document.activeElement !== $('#at-rotation')) $('#at-rotation').value = String(c.rotation);
  if (document.activeElement !== $('#at-graine')) $('#at-graine').value = c.graine;
  $('#at-graine-ligne').hidden = c.partie !== 'infini';
  [sel, $('#at-rotation'), $('#at-graine')].forEach((x) => { x.disabled = !etat.hote; });
  $('#at-lancer').hidden = !etat.hote;
  const presents = etat.joueurs.filter((j) => j.connecte).length;
  $('#at-lancer').disabled = presents < 2;
  $('#at-hote-info').textContent = etat.hote
    ? (presents < 2 ? 'En attente d\'au moins un collègue…' : `${presents} joueurs prêts. Les postes sont attribués au lancement.`)
    : "L'hôte règle la partie et la lance.";
}

function rendreEntete() {
  const p = etat.partie;
  $('#j-code').textContent = etat.code;
  $('#j-section').textContent = p.section;
  $('#j-titre').textContent = p.titre;
  $('#j-poste').textContent = NOM_POSTE[etat.moi.poste] ?? 'Observateur';
  $('#j-poste').dataset.poste = etat.moi.poste ?? '';
  $('#j-horloge').textContent = p.horloge;
  $('#j-horloge').classList.toggle('tard', p.tard);
  $('#j-score').textContent = `${p.score} pts`;
  $('#j-cred').style.setProperty('--niveau', `${p.credibilite}%`);
  $('#j-cred').classList.toggle('basse', p.credibilite <= 40);
  const rot = p.rotation ? `Changement de poste dans ${p.prochaineRotation} dossier${p.prochaineRotation > 1 ? 's' : ''}` : 'Postes fixes';
  maj($('#j-equipe'), `${etat.joueurs.filter((j) => j.poste).map((j) =>
    `<span class="eq ${j.connecte ? '' : 'hors-ligne'}${j.id === etat.moi.id ? ' moi' : ''}"><strong>${esc(j.pseudo)}</strong> ${NOM_POSTE[j.poste]}</span>`).join('')}
    <span class="eq-rot">${rot}${p.total ? `. Dossier ${p.index + 1} sur ${p.total}` : `. Dossier ${p.index + 1}`}</span>`);
  rendreAnnonce();
}

function rendreJeu() {
  afficherEcran('ecran-jeu');
  const p = etat.partie;
  const poste = etat.moi.poste;
  rendreEntete();
  sons(p);

  const vue = p.etape === 'intro' ? 'intro' : p.etape === 'correction' ? 'correction' : `examen-${poste}`;
  const cle = `${vue}|${p.inspecteur}`;
  const plan = $('#j-plan');
  const atlas = $('#j-atlas-hote');
  if (cle !== gabarit) {
    document.body.appendChild(atlas); atlas.hidden = true;  // l'atlas survit aux changements de gabarit
    plan.innerHTML = gabarits[vue]?.(p) ?? '';
    plan.dataset.vue = vue;
    gabarit = cle;
    const slot = $('#slot-atlas');
    if (slot) { slot.appendChild(atlas); atlas.hidden = false; }
  }
  remplir[vue]?.(p);
}

const tampons = () => `<div class="porte-tampons" role="group" aria-label="Tampons">
  ${['ACCEPTER', 'RECTIFIER', 'TRANSFERER', 'REFUSER'].map((d, i) => `<button class="tampon" data-action="tamponner" data-decision="${d}" type="button">
    <span class="t-manche"></span><span class="t-semelle">${['Accepter', 'Rectifier', 'Transférer', 'Refuser'][i]}</span><kbd>${i + 1}</kbd></button>`).join('')}
  <div id="choix-region" class="choix-region" hidden>
    <p class="cr-titre">Transférer vers…</p>
    <div class="cr-liste">${Object.entries(REGIONS).sort(([, a], [, b]) => a.localeCompare(b, 'fr'))
      .map(([c, n]) => `<button type="button" data-action="region" data-region="${c}">${esc(n)}</button>`).join('')}</div>
    <button type="button" class="cr-annuler" data-action="annuler-region">Annuler</button>
  </div></div>`;

const gabarits = {
  intro: (p) => `<div class="carte-centre"><div class="note-papier">
    <h2>Note de service</h2><p>${esc(p.intro)}</p>
    <p class="aide-poste"><strong>Votre poste : ${NOM_POSTE[etat.moi.poste]}.</strong> ${AIDE_POSTE[etat.moi.poste]}</p>
    <p class="discret">Parlez-vous (à voix haute ou en visio) : personne n'a toutes les informations.</p>
    <button class="btn-principal" data-action="commencer" type="button">Ouvrir le guichet</button></div></div>`,
  'examen-guichet': (p) => `
    <div class="col-dossier"><div id="g-dossier" class="dossier"></div><div id="g-etat" class="etat-equipe"></div>${tampons()}</div>
    <aside class="col-cote">${p.inspecteur ? '<div class="placard-ligne">Le règlement, les pièces et le registre sont chez l\'inspecteur.</div>' : '<div id="pieces" class="dossier dossier-pieces"></div><div id="regl" class="memo"></div>'}</aside>`,
  'examen-geographe': () => `
    <div class="col-dossier"><div id="geo-tel"></div><div id="geo-decl" class="dossier"></div></div>
    <aside class="col-cote" id="slot-atlas"></aside>`,
  'examen-inspecteur': () => `
    <div class="col-dossier"><div id="in-valid"></div><div id="pieces" class="dossier dossier-pieces"></div></div>
    <aside class="col-cote"><div id="regl" class="memo"></div></aside>`,
  correction: () => `<div class="col-correction"><div id="corr" class="note-papier correction"></div><div id="corr-dossier" class="dossier"></div></div>`,
};

function formulairePieces(b) {
  const s = new Set(b.signalementsPieces ?? []);
  return `<article class="formulaire formulaire-court">
    <header class="f-entete"><div><span class="f-ref">Annexes</span><span class="f-titre">Montant, pièces et registre</span></div></header>
    ${b.montant !== null ? `<div class="f-champ"><span class="f-label">Montant sollicité</span><span class="f-val">${euros(b.montant)}</span></div>` : '<div class="f-champ"><span class="f-label">Montant sollicité</span><span class="f-val">Sans objet</span></div>'}
    <button type="button" class="signalable f-pieces" data-action="signaler-piece" data-cible="pieces" aria-pressed="${s.has('pieces')}">
      <span class="f-label">Pièces jointes</span><span class="f-val">${b.pieces.length ? b.pieces.map(esc).join(' ; ') : 'Aucune'}</span></button>
  </article>
  <aside class="registre"><button type="button" class="signalable reg-corps" data-action="signaler-piece" data-cible="registre" aria-pressed="${s.has('registre')}">
    <span class="reg-titre">Extrait du registre national des communes</span>
    <span class="reg-ligne"><span class="f-label">Nom</span><span class="f-val">${esc(b.registre.nom)}</span></span>
    <span class="reg-ligne"><span class="f-label">Code INSEE</span><span class="f-val reg-code">${esc(b.registre.insee)}</span></span>
    <span class="reg-copie">Copie certifiée conforme</span></button></aside>`;
}

const remplir = {
  'examen-guichet': (p) => {
    const b = p.bureau;
    maj($('#g-dossier'), `${b.conseil ? `<aside class="postit" role="note"><span class="postit-de">Note du chef de bureau</span>${esc(b.conseil)}</aside>` : ''}<article class="formulaire">
      <header class="f-entete"><div><span class="f-ref">Formulaire 404-B</span><span class="f-titre">Demande d'une collectivité territoriale</span></div>
        <div class="f-num">Réf. <span>${esc(b.ref)}</span></div></header>
      <div class="f-champ f-commune"><span class="f-label">Commune</span><span class="f-val">${esc(b.commune)}</span></div>
      <div class="f-champ"><span class="f-label">Objet de la demande</span><span class="f-val">${esc(b.objet)}</span></div>
      <div class="f-champ f-condition"><span class="f-label">Condition d'éligibilité</span><span class="f-val">${esc(b.condition)}</span></div>
      ${b.montant !== null ? `<div class="f-champ"><span class="f-label">Montant sollicité</span><span class="f-val">${euros(b.montant)}</span></div>` : ''}
      <div class="f-champ"><span class="f-label">Demandeur</span><span class="f-val">${esc(b.demandeur)}</span></div>
      <div class="f-champ f-renvoi"><span class="f-label">Déclarations de la commune</span><span class="f-val">Feuillet transmis au géographe</span></div>
      <p class="f-mot">« ${esc(b.mot)} »</p></article>`);
    if (!p.inspecteur) { maj($('#pieces'), formulairePieces(b)); maj($('#regl'), htmlReglement(p.contexte)); }
    const n = p.nbSignalements;
    maj($('#g-etat'), p.validation
      ? `<p class="attente-validation">Tampon « ${LIBELLE_DECISION[p.validation.decision]} » posé. L'inspecteur peut s'y opposer : ${Math.ceil(p.validation.resteMs / 1000)} s…</p>`
      : `<p>Annotations de l'équipe : <strong>${n}</strong> élément${n > 1 ? 's' : ''} signalé${n > 1 ? 's' : ''} comme faux.</p>`);
    $$('.tampon').forEach((t) => { t.disabled = Boolean(p.validation); });
    if (p.validation) $('#choix-region').hidden = true;
  },
  'examen-geographe': (p) => {
    const b = p.bureau;
    maj($('#geo-decl'), `<article class="formulaire">
      <header class="f-entete"><div><span class="f-ref">Feuillet 404-B bis</span><span class="f-titre">Déclarations de la commune</span></div></header>
      <div class="f-champ"><span class="f-label">Commune</span><span class="f-val f-cache">Voir le formulaire principal (guichet)</span></div>
      <fieldset class="f-decl"><legend>Cliquez sur les lignes fausses</legend>
      ${b.declarations.map((d) => `<button type="button" class="signalable decl" data-action="signaler" data-cible="${d.cible}" aria-pressed="${d.signale}">
        <span class="f-label">${esc(d.label)}</span><span class="f-val">${esc(d.valeur)}</span></button>`).join('')}
      </fieldset></article>`);
    const tel = $('#geo-tel');
    const idAppel = b.appel?.id ?? '';
    if (tel.dataset.appel !== idAppel || !tel.firstChild) {
      tel.dataset.appel = idAppel;
      tel.innerHTML = b.appel ? `<div class="telephone sonne">
        <p class="tel-qui">${esc(b.appel.appelant)} au téléphone <span class="tel-reste"></span></p>
        <p class="tel-question">« ${esc(b.appel.texte)} »</p>
        <div class="tel-boutons"><button class="btn-principal" data-action="repondre" data-oui="1" type="button">Oui</button>
        <button class="btn-principal" data-action="repondre" data-oui="0" type="button">Non</button></div></div>`
        : '<div class="telephone"><p class="tel-qui">Le téléphone est silencieux. Pour l\'instant.</p></div>';
    }
    if (b.appel) $('.tel-reste', tel).textContent = `${Math.ceil(b.appel.resteMs / 1000)} s`;
  },
  'examen-inspecteur': (p) => {
    const b = p.bureau;
    maj($('#pieces'), formulairePieces(b));
    maj($('#regl'), htmlReglement(p.contexte));
    const val = $('#in-valid');
    const cleVal = p.validation ? `${p.validation.decision}|${p.validation.destination}` : `-${p.nbSignalements}`;
    if (val.dataset.cle !== cleVal) {
      val.dataset.cle = cleVal;
      val.innerHTML = p.validation
        ? `<div class="validation active"><p>Le guichet a tamponné <strong class="encre-${p.validation.decision}">${LIBELLE_DECISION[p.validation.decision]}</strong>${p.validation.destination ? ` vers ${esc(REGIONS[p.validation.destination])}` : ''}.</p>
           <button class="btn-opposition" data-action="opposition" type="button">Opposition ! <span class="reste"></span></button></div>`
        : `<div class="validation"><p>Aucun tampon en attente. Annotations de l'équipe : <strong>${p.nbSignalements}</strong>.</p></div>`;
    }
    if (p.validation) $('.reste', val).textContent = `${Math.ceil(p.validation.resteMs / 1000)} s`;
  },
  correction: (p) => {
    const c = p.correction;
    const att = c.attendu === 'TRANSFERER' ? `${LIBELLE_DECISION.TRANSFERER} vers ${REGIONS[c.destinationAttendue]}` : LIBELLE_DECISION[c.attendu];
    const vous = c.destination ? `${LIBELLE_DECISION[c.decision]} vers ${REGIONS[c.destination]}` : LIBELLE_DECISION[c.decision];
    let justif = '';
    if (c.bonne) justif = c.justification ? '<p class="c-justif ok">Annotations exactes : bonus de justification.</p>' : '<p class="c-justif">Annotations inexactes (ou mauvaise destination) : pas de bonus.</p>';
    maj($('#corr'), `<h2>${c.bonne ? `Bonne décision, +${c.points} points` : c.penalite ? `Décision erronée, crédibilité −${c.penalite}` : "Décision erronée (période d'essai : sans pénalité)"}</h2>
      ${c.bonne ? '' : `<p class="c-compare">Tampon de l'équipe : <strong>${esc(vous)}</strong>. Attendu : <strong>${esc(att)}</strong>.</p>`}
      ${c.lecon ? `<p class="c-lecon">${esc(c.lecon)}</p>` : ''}${justif}
      <ul class="c-expl">${c.explications.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      ${c.note && (!c.bonne) ? `<p class="c-savoir">Le saviez-vous ? ${esc(c.note)}</p>` : ''}
      <button class="btn-principal" data-action="suivant" type="button">Dossier suivant</button>`);
    const d = c.dossier;
    maj($('#corr-dossier'), `<article class="formulaire">
      <header class="f-entete"><div><span class="f-ref">Dossier complet</span><span class="f-titre">${esc(d.commune)}</span></div></header>
      <div class="f-champ"><span class="f-label">Objet</span><span class="f-val">${esc(d.objet)}</span></div>
      <div class="f-champ f-condition"><span class="f-label">Condition</span><span class="f-val">${esc(d.condition)}</span></div>
      ${d.montant !== null ? `<div class="f-champ"><span class="f-label">Montant</span><span class="f-val">${euros(d.montant)}</span></div>` : ''}
      ${d.declarations.map((x) => `<div class="f-champ ${x.anomalie ? 'anomalie-reelle' : ''}"><span class="f-label">${esc(x.label)}</span><span class="f-val">${esc(x.valeur)}</span></div>`).join('')}
      <div class="f-champ ${d.anomaliesPieces.includes('pieces') ? 'anomalie-reelle' : ''}"><span class="f-label">Pièces jointes</span><span class="f-val">${d.pieces.length ? d.pieces.map(esc).join(' ; ') : 'Aucune'}</span></div>
      <div class="f-champ ${d.anomaliesPieces.includes('registre') ? 'anomalie-reelle' : ''}"><span class="f-label">Registre (code INSEE)</span><span class="f-val">${esc(d.registre.insee)}</span></div>
    </article>
    <div class="empreinte encre-${c.decision}"><span class="emp-mot">${LIBELLE_DECISION[c.decision]}</span><span class="emp-sous">${c.destination ? `vers ${esc(REGIONS[c.destination])}` : 'Guichet 404'}</span></div>`);
  },
};

function sons(p) {
  if (memo.etape !== p.etape) {
    if ((p.etape === 'validation') || (p.etape === 'correction' && memo.etape === 'examen')) sonTampon();
    if (p.etape === 'correction' && !p.correction.bonne) setTimeout(sonErreur, 300);
    if (p.etape === 'examen' && memo.etape === 'correction') sonPapier();
    memo.etape = p.etape;
  }
  const appelId = p.bureau?.appel?.id ?? null;
  if (appelId && appelId !== memo.appel) sonTelephone();
  memo.appel = appelId;
  if (p.annonce?.t !== memo.annonce) {
    if (p.annonce?.ton === 'rotation') sonPapier();
    memo.annonce = p.annonce?.t;
  }
}

function rendreBilan() {
  afficherEcran('ecran-bilan');
  gabarit = '';
  const p = etat.partie;
  const b = p.bilan;
  const bons = b.resultats.filter((r) => r.points > 0).length;
  const titre = b.raison === 'credibilite' ? "Mutation d'office" : b.raison === 'retard' ? '17 h 00, le guichet ferme' : 'Fin de journée';
  maj($('#bilan'), `<h2>${titre}</h2>
    <p class="bilan-chapeau">${b.raison === 'credibilite' ? "La crédibilité de l'équipe est épuisée : tout le service est muté à Clipperton." : `Équipe : ${etat.joueurs.filter((j) => j.poste).map((j) => esc(j.pseudo)).join(', ')}.`}</p>
    <div class="bilan-chiffres">
      <p><span class="bc-n">${p.score}</span> points</p>
      <p><span class="bc-n">${bons}/${b.resultats.length}</span> bonnes décisions</p>
      <p><span class="bc-n">${b.appels.bons}/${b.appels.bons + b.appels.rates}</span> appels réussis</p>
      <p><span class="bc-n">${b.oppositions}</span> opposition${b.oppositions > 1 ? 's' : ''}</p>
    </div>
    <table class="bilan-table"><thead><tr><th>Commune</th><th>Tampon</th><th>Attendu</th><th>Points</th></tr></thead>
    <tbody>${b.resultats.map((r) => `<tr class="${r.points ? '' : 'ko'}"><td>${esc(r.commune)}</td><td>${LIBELLE_DECISION[r.decision]}</td>
      <td>${LIBELLE_DECISION[r.attendu]}${r.destination ? ` (${esc(REGIONS[r.destination])})` : ''}</td><td>${r.points}${r.justification ? ' ✓' : ''}</td></tr>`).join('')}</tbody></table>
    <div class="bilan-actions">
      ${etat.hote ? '<button class="btn-principal" id="bl-salle" type="button">Retour en salle d\'attente</button>' : '<p class="discret">L\'hôte peut ramener l\'équipe en salle d\'attente pour une nouvelle partie.</p>'}
      <a class="btn" href="index.html">Quitter le salon</a></div>`);
  $('#bl-salle')?.addEventListener('click', () => agir('salle'));
}

// ——————————————————————————— Interactions
function init() {
  monterAtlas($('#atlas'));
  const son = $('#btn-son');
  const majSon = () => { son.textContent = estMuet() ? 'Son coupé' : 'Son actif'; };
  son.addEventListener('click', () => { basculerMuet(); majSon(); });
  majSon();

  $('#j-plan').addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b || b.disabled) return;
    const a = b.dataset.action;
    if (a === 'tamponner') {
      if (b.dataset.decision === 'TRANSFERER') { $('#choix-region').hidden = false; return; }
      return agir('tamponner', { decision: b.dataset.decision });
    }
    if (a === 'region') { $('#choix-region').hidden = true; return agir('tamponner', { decision: 'TRANSFERER', destination: b.dataset.region }); }
    if (a === 'annuler-region') { $('#choix-region').hidden = true; return; }
    if (a === 'signaler' || a === 'signaler-piece') {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); // retour immédiat
      return agir(a, { cible: b.dataset.cible });
    }
    if (a === 'repondre') return agir('repondre', { oui: b.dataset.oui === '1' });
    if (['commencer', 'suivant', 'opposition'].includes(a)) return agir(a);
  });

  document.addEventListener('keydown', (e) => {
    if (!etat?.partie || e.target.matches('input, select')) return;
    const p = etat.partie;
    if (e.key === 'Enter' && p.etape === 'correction') return agir('suivant');
    if (p.etape !== 'examen' || etat.moi.poste !== 'guichet') return;
    if (e.key === 'Escape') { $('#choix-region').hidden = true; return; }
    const d = { 1: 'ACCEPTER', 2: 'RECTIFIER', 3: 'TRANSFERER', 4: 'REFUSER' }[e.key];
    if (d === 'TRANSFERER') $('#choix-region').hidden = false;
    else if (d) agir('tamponner', { decision: d });
  });
  setInterval(rendreAnnonce, 1000);
  connecter();
}

init();
