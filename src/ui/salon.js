// Client du jeu en ligne, version « bureau partagé ».
// Le serveur arbitre ; ce fichier affiche l'état reçu (flux SSE) et envoie les actions.
// Tous les joueurs voient le même dossier ; seul l'atlas diffère (onglets répartis).
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

const code = (new URLSearchParams(location.search).get('code') ?? '').toUpperCase();
let jeton = lireJeton(code);
let etat = null;
let source = null;
let echecs = 0;
let atlas = null;
const memo = { etape: null, appel: null, repartition: null, proposition: null, noteCle: null };

function afficherEcran(id) { $$('.ecran').forEach((e) => { e.hidden = e.id !== id; }); }
function maj(el, html) { if (el && el.__html !== html) { el.innerHTML = html; el.__html = html; } }
const pastille = (couleur) => `<span class="pastille couleur-${couleur}" aria-hidden="true"></span>`;

async function agir(type, donnees = {}) {
  try { await appel(`api/salons/${code}/action`, { jeton, type, ...donnees }); }
  catch (e) { annoncer(e.message, 'ko'); }
}

let annonceLocale = null;
function annoncer(texte, ton) { annonceLocale = { texte, ton, t: Date.now() }; rendreAnnonce(); }
function rendreAnnonce() {
  const loc = annonceLocale && Date.now() - annonceLocale.t < 5000 ? annonceLocale : null;
  const x = loc ?? etat?.partie?.annonce;
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
  memo.noteCle = null;
  $('#at-code').textContent = etat.code;
  const lien = new URL(`salon.html?code=${etat.code}`, location.href).href;
  $('#at-lien').textContent = lien;
  $('#at-copier').onclick = async () => {
    try { await navigator.clipboard.writeText(lien); $('#at-copier').textContent = 'Copié'; } catch { /* sélection manuelle */ }
  };
  $('#at-nb').textContent = `(${etat.joueurs.length}/3)`;
  maj($('#at-joueurs'), etat.joueurs.map((j) => `<li class="${j.connecte ? '' : 'hors-ligne'}">
    ${pastille(j.couleur)}${esc(j.pseudo)}${j.id === etat.hoteId ? ' <span class="discret">(hôte)</span>' : ''}${j.id === etat.moi.id ? ' <span class="discret">(vous)</span>' : ''}</li>`).join(''));

  const sel = $('#at-partie');
  if (!sel.options.length) {
    sel.innerHTML = etat.journees.map((j) => `<option value="${j.id}">${esc(j.titre)}</option>`).join('') + '<option value="infini">Mode infini</option>';
    sel.onchange = () => agir('config', { partie: sel.value });
    $('#at-graine').onchange = () => agir('config', { graine: $('#at-graine').value });
    $('#at-lancer').onclick = async () => {
      $('#at-erreur').hidden = true;
      try { await appel(`api/salons/${code}/action`, { jeton, type: 'demarrer' }); }
      catch (e) { $('#at-erreur').hidden = false; $('#at-erreur').textContent = e.message; }
    };
  }
  const c = etat.config;
  if (document.activeElement !== sel) sel.value = c.partie;
  if (document.activeElement !== $('#at-graine')) $('#at-graine').value = c.graine;
  $('#at-graine-ligne').hidden = c.partie !== 'infini';
  [sel, $('#at-graine')].forEach((x) => { x.disabled = !etat.hote; });
  $('#at-lancer').hidden = !etat.hote;
  const presents = etat.joueurs.filter((j) => j.connecte).length;
  $('#at-lancer').disabled = presents < 2;
  $('#at-hote-info').textContent = etat.hote
    ? (presents < 2 ? "En attente d'au moins un collègue…" : `${presents} joueurs prêts.`)
    : "L'hôte choisit la journée et lance la partie.";
}

function rendreJeu() {
  afficherEcran('ecran-jeu');
  const p = etat.partie;
  $('#j-code').textContent = etat.code;
  $('#j-section').textContent = p.section;
  $('#j-titre').textContent = p.titre;
  $('#j-horloge').textContent = p.horloge;
  $('#j-horloge').classList.toggle('tard', p.tard);
  $('#j-score').textContent = `${p.score} pts`;
  $('#j-cred').style.setProperty('--niveau', `${p.credibilite}%`);
  $('#j-cred').classList.toggle('basse', p.credibilite <= 40);
  maj($('#j-regl'), htmlReglement(p.contexte));
  maj($('#j-equipe'), `${p.repartition.map((r) => `<span class="eq${r.id === etat.moi.id ? ' moi' : ''}">${pastille(r.couleur)}<strong>${esc(r.pseudo)}</strong> ${r.onglets.join(', ')}</span>`).join('')}
    <span class="eq-rot">${p.total ? `Dossier ${p.index + 1} sur ${p.total}` : `Dossier ${p.index + 1}`}. Les onglets changent à chaque dossier.</span>`);
  rendreAnnonce();

  // Atlas : uniquement mes onglets ; redistribué à chaque dossier
  const cleRep = `${p.index}|${p.mesOnglets.join(',')}`;
  if (memo.repartition !== cleRep) {
    memo.repartition = cleRep;
    const proprietaires = {};
    for (const r of p.repartition) for (const k of r.cles) if (r.id !== etat.moi.id) proprietaires[k] = r.pseudo;
    atlas.configurer({ onglets: p.mesOnglets, proprietaires });
    $('#j-mes-onglets').textContent = `(${p.mesOnglets.length} onglets sur 6)`;
    if (p.index > 0) sonPapier();
  }

  rendreDossier(p);
  rendreTelephone(p);
  rendreEpingles(p);
  rendreSignature(p);
  rendreNote(p);
  sons(p);
}

function rendreDossier(p) {
  const d = p.dossier;
  if (!d) { maj($('#j-dossier'), ''); return; }
  const anom = new Set(p.correction?.anomalies ?? []);
  const fige = p.etape !== 'examen';
  const ligne = (cible, label, valeur, signale, classe = 'decl') => `<button type="button" class="signalable ${classe}${anom.has(cible) ? ' anomalie-reelle' : ''}"
    data-action="signaler" data-cible="${cible}" aria-pressed="${Boolean(signale)}" ${signale ? `data-couleur="${signale}"` : ''} ${fige ? 'disabled' : ''}>
    <span class="f-label">${esc(label)}</span><span class="f-val">${esc(valeur)}</span></button>`;
  const c = p.correction;
  maj($('#j-dossier'), `
    ${d.conseil && p.etape === 'examen' ? `<aside class="postit" role="note"><span class="postit-de">Note du chef de bureau</span>${esc(d.conseil)}</aside>` : ''}
    <article class="formulaire">
      <header class="f-entete"><div><span class="f-ref">Formulaire 404-B</span><span class="f-titre">Demande d'une collectivité territoriale</span></div>
        <div class="f-num">Réf. <span>${esc(d.ref)}</span></div></header>
      <div class="f-champ f-commune"><span class="f-label">Commune</span><span class="f-val">${esc(d.commune)}</span></div>
      <div class="f-champ"><span class="f-label">Objet de la demande</span><span class="f-val">${esc(d.objet)}</span></div>
      <div class="f-champ f-condition"><span class="f-label">Condition d'éligibilité</span><span class="f-val">${esc(d.condition)}</span></div>
      ${d.montant !== null ? `<div class="f-champ"><span class="f-label">Montant sollicité</span><span class="f-val">${euros(d.montant)}</span></div>` : ''}
      <div class="f-champ"><span class="f-label">Demandeur</span><span class="f-val">${esc(d.demandeur)}</span></div>
      <fieldset class="f-decl"><legend>Déclarations de la commune</legend>
        ${d.declarations.map((x) => ligne(x.cible, x.label, x.valeur, x.signale)).join('')}
      </fieldset>
      ${ligne('pieces', 'Pièces jointes', d.pieces.length ? d.pieces.join(' ; ') : 'Aucune', d.piecesSignale, 'f-pieces')}
      <p class="f-mot">« ${esc(d.mot)} »</p>
    </article>
    <aside class="registre">
      <button type="button" class="signalable reg-corps${anom.has('registre') ? ' anomalie-reelle' : ''}" data-action="signaler" data-cible="registre"
        aria-pressed="${Boolean(d.registre.signale)}" ${d.registre.signale ? `data-couleur="${d.registre.signale}"` : ''} ${fige ? 'disabled' : ''}>
        <span class="reg-titre">Extrait du registre national des communes</span>
        <span class="reg-ligne"><span class="f-label">Nom</span><span class="f-val">${esc(d.registre.nom)}</span></span>
        <span class="reg-ligne"><span class="f-label">Code INSEE</span><span class="f-val reg-code">${esc(d.registre.insee)}</span></span>
        <span class="reg-copie">Copie certifiée conforme</span>
      </button>
    </aside>
    ${c ? `<div class="empreinte encre-${c.decision}"><span class="emp-mot">${LIBELLE_DECISION[c.decision]}</span>
      <span class="emp-sous">${c.destination ? `vers ${esc(REGIONS[c.destination])}` : `${esc(c.signataires.join(' et '))}`}</span></div>` : ''}`);
}

function rendreTelephone(p) {
  const tel = $('#j-tel');
  const id = p.appel?.id ?? '';
  if (tel.dataset.appel !== id) {
    tel.dataset.appel = id;
    tel.innerHTML = p.appel ? `<div class="telephone sonne">
      <p class="tel-qui">${esc(p.appel.appelant)} au téléphone. Question bonus, facultative. <span class="tel-reste"></span></p>
      <p class="tel-question">« ${esc(p.appel.texte)} »</p>
      <div class="tel-boutons">${p.appel.choix.map((c, i) => `<button class="btn-principal" data-action="repondre" data-choix="${i}" type="button">${esc(c)}</button>`).join('')}</div>
    </div>` : '';
  }
  if (p.appel) $('.tel-reste', tel).textContent = `${Math.ceil(p.appel.resteMs / 1000)} s`;
}

function rendreEpingles(p) {
  const l = p.epingles ?? [];
  $('#j-nb-epingles').textContent = l.length ? `(${l.length})` : '';
  maj($('#j-epingles'), l.length
    ? l.map((e) => `<li class="epingle couleur-${e.couleur}"><span class="ep-texte">${esc(e.texte)}</span>
        <span class="ep-auteur">${esc(e.pseudo)}</span>
        ${p.etape === 'examen' ? `<button class="ep-retirer" data-action="depingler" data-id="${e.id}" type="button" aria-label="Retirer l'épingle">×</button>` : ''}</li>`).join('')
    : `<li class="epingles-vide">${p.etape === 'examen' ? 'Cliquez une ligne de votre atlas pour la partager ici.' : ''}</li>`);
}

function rendreSignature(p) {
  const pr = p.proposition;
  const enExamen = p.etape === 'examen';
  $$('.tampon').forEach((t) => { t.disabled = !enExamen; t.classList.toggle('propose', pr?.decision === t.dataset.decision); });
  if (!enExamen) { $('#choix-region').hidden = true; maj($('#j-signature'), ''); return; }
  const dest = pr?.destination ? ` vers ${esc(REGIONS[pr.destination])}` : '';
  maj($('#j-signature'), !pr
    ? '<p class="sig-aide">Proposez un tampon : un collègue devra le contresigner.</p>'
    : pr.parMoi
      ? `<div class="sig-boite couleur-${pr.couleur}"><p>Vous proposez <strong class="encre-${pr.decision}">${LIBELLE_DECISION[pr.decision]}</strong>${dest}. En attente de la contresignature d'un collègue…</p>
         <button class="btn" data-action="retirer" type="button">Retirer</button></div>`
      : `<div class="sig-boite couleur-${pr.couleur} a-signer"><p><strong>${esc(pr.pseudo)}</strong> propose <strong class="encre-${pr.decision}">${LIBELLE_DECISION[pr.decision]}</strong>${dest}.</p>
         <button class="btn-principal" data-action="contresigner" type="button">Contresigner</button>
         <button class="btn" data-action="contester" type="button">Contester</button></div>`);
}

function rendreNote(p) {
  let cle = null;
  let cfg = null;
  if (p.etape === 'intro') {
    cle = 'intro';
    cfg = {
      titre: 'Note de service', modal: true,
      corps: `<p>${esc(p.intro)}</p>
        <p class="aide-poste">Vous voyez tous le même dossier. Votre atlas ne contient que <strong>${esc(p.repartition.find((r) => r.id === etat.moi.id)?.onglets.join(', '))}</strong> : épinglez ce que vous trouvez, et chaque tampon doit être contresigné par un collègue.</p>`,
      bouton: 'Ouvrir le guichet', action: 'commencer',
    };
  } else if (p.etape === 'correction') {
    const c = p.correction;
    cle = `corr-${p.index}`;
    const att = c.attendu === 'TRANSFERER' ? `${LIBELLE_DECISION.TRANSFERER} vers ${REGIONS[c.destinationAttendue]}` : LIBELLE_DECISION[c.attendu];
    const vous = c.destination ? `${LIBELLE_DECISION[c.decision]} vers ${REGIONS[c.destination]}` : LIBELLE_DECISION[c.decision];
    const justif = c.bonne
      ? (c.justification ? '<p class="c-justif ok">Annotations exactes : bonus de justification.</p>' : '<p class="c-justif">Annotations inexactes (ou mauvaise destination) : pas de bonus.</p>')
      : '';
    cfg = {
      titre: c.bonne ? `Bonne décision, +${c.points} points` : c.penalite ? `Décision erronée, crédibilité −${c.penalite}` : "Décision erronée (période d'essai : sans pénalité)",
      classe: c.bonne ? 'note-ok' : 'note-ko',
      corps: `<p class="discret">Tampon signé par ${esc(c.signataires.join(' et '))}.</p>
        ${c.bonne ? '' : `<p class="c-compare">Tampon de l'équipe : <strong>${esc(vous)}</strong>. Attendu : <strong>${esc(att)}</strong>.</p>`}
        ${c.lecon ? `<p class="c-lecon">${esc(c.lecon)}</p>` : ''}${justif}
        <ul class="c-expl">${c.explications.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        ${c.note && !c.bonne ? `<p class="c-savoir">Le saviez-vous ? ${esc(c.note)}</p>` : ''}`,
      bouton: 'Dossier suivant', action: 'suivant',
    };
  }
  const n = $('#note');
  if (cle === memo.noteCle) return;
  memo.noteCle = cle;
  if (!cfg) { n.hidden = true; return; }
  n.className = `note ${cfg.classe ?? ''}${cfg.modal ? '' : ' lateral'}`;
  $('#note-titre').textContent = cfg.titre;
  $('#note-corps').innerHTML = cfg.corps;
  $('#note-bouton').textContent = cfg.bouton;
  $('#note-bouton').onclick = () => agir(cfg.action);
  n.hidden = false;
}

function sons(p) {
  if (memo.etape !== p.etape) {
    if (p.etape === 'correction' && memo.etape === 'examen') {
      sonTampon();
      if (!p.correction.bonne) setTimeout(sonErreur, 300);
    }
    memo.etape = p.etape;
  }
  const idAppel = p.appel?.id ?? null;
  if (idAppel && idAppel !== memo.appel) sonTelephone();
  memo.appel = idAppel;
  const cleProp = p.proposition ? `${p.proposition.pseudo}|${p.proposition.decision}` : null;
  if (cleProp && cleProp !== memo.proposition && !p.proposition.parMoi) sonPapier();
  memo.proposition = cleProp;
}

function rendreBilan() {
  afficherEcran('ecran-bilan');
  memo.noteCle = null;
  const p = etat.partie;
  const b = p.bilan;
  const bons = b.resultats.filter((r) => r.points > 0).length;
  const titre = b.raison === 'credibilite' ? "Mutation d'office" : b.raison === 'retard' ? '17 h 00, le guichet ferme' : 'Fin de journée';
  const nbAppels = b.appels.bons + b.appels.faux + b.appels.ignores;
  maj($('#bilan'), `<h2>${titre}</h2>
    <p class="bilan-chapeau">${b.raison === 'credibilite' ? "La crédibilité de l'équipe est épuisée : tout le service est muté à Clipperton." : `Équipe : ${p.repartition.map((r) => esc(r.pseudo)).join(', ')}.`}</p>
    <div class="bilan-chiffres">
      <p><span class="bc-n">${p.score}</span> points</p>
      <p><span class="bc-n">${bons}/${b.resultats.length}</span> bonnes décisions</p>
      <p><span class="bc-n">${b.appels.bons}/${nbAppels}</span> questions bonus</p>
      <p><span class="bc-n">${b.contestations}</span> contestation${b.contestations > 1 ? 's' : ''}</p>
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
function ouvrirChoixRegion() {
  const box = $('#choix-region');
  box.innerHTML = `<p class="cr-titre">Proposer un transfert vers…</p>
    <div class="cr-liste">${Object.entries(REGIONS).sort(([, a], [, b]) => a.localeCompare(b, 'fr'))
      .map(([c, n]) => `<button type="button" data-action="region" data-region="${c}">${esc(n)}</button>`).join('')}</div>
    <button type="button" class="cr-annuler" data-action="annuler-region">Annuler</button>`;
  box.hidden = false;
}

function init() {
  atlas = monterAtlas($('#atlas'), {
    onglets: [],
    epingler: (onglet, cle) => agir('epingler', { onglet, cle }),
  });
  const son = $('#btn-son');
  const majSon = () => { son.textContent = estMuet() ? 'Son coupé' : 'Son actif'; };
  son.addEventListener('click', () => { basculerMuet(); majSon(); });
  majSon();

  $('#ecran-jeu').addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b || b.disabled) return;
    const a = b.dataset.action;
    if (a === 'proposer') {
      if (b.dataset.decision === 'TRANSFERER') return ouvrirChoixRegion();
      return agir('proposer', { decision: b.dataset.decision });
    }
    if (a === 'region') { $('#choix-region').hidden = true; return agir('proposer', { decision: 'TRANSFERER', destination: b.dataset.region }); }
    if (a === 'annuler-region') { $('#choix-region').hidden = true; return; }
    if (a === 'signaler') {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); // retour immédiat
      return agir('signaler', { cible: b.dataset.cible });
    }
    if (a === 'depingler') return agir('depingler', { id: b.dataset.id });
    if (a === 'repondre') return agir('repondre', { choix: Number(b.dataset.choix) });
    if (['contresigner', 'contester', 'retirer'].includes(a)) return agir(a);
  });

  document.addEventListener('keydown', (e) => {
    const p = etat?.partie;
    if (!p || e.target.matches('input, select')) return;
    if (e.key === 'Enter' && !$('#note').hidden && !e.target.closest('tr')) { e.preventDefault(); return $('#note-bouton').click(); }
    if (p.etape !== 'examen') return;
    if (e.key === 'Escape') { $('#choix-region').hidden = true; return; }
    const d = { 1: 'ACCEPTER', 2: 'RECTIFIER', 3: 'TRANSFERER', 4: 'REFUSER' }[e.key];
    if (d === 'TRANSFERER') ouvrirChoixRegion();
    else if (d) agir('proposer', { decision: d });
  });
  setInterval(rendreAnnonce, 1000);
  connecter();
}

init();
