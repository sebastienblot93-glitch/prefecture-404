// Règlement du Bureau national de vérification des territoires
// et moteur de décision : Accepter / Rectifier / Transférer / Refuser.
import { REGIONS, DEPARTEMENTS } from '../data/territoires.js';
import { COURS_EAU, MASSIFS, duCoursEau } from '../data/geographie.js';
import { COMMUNE_PAR_INSEE } from '../data/communes.js';
import { evaluer, regionDe, libDep } from './verite.js';

export const DECISIONS = ['ACCEPTER', 'RECTIFIER', 'TRANSFERER', 'REFUSER'];
export const LIBELLE_DECISION = {
  ACCEPTER: 'Accepté', RECTIFIER: 'Rectifié', TRANSFERER: 'Transféré', REFUSER: 'Refusé',
};

export const SECTIONS = {
  OUEST:    { nom: 'Section Ouest',    regions: ['53', '28', '52', '24', '75'] },
  SUD_EST:  { nom: 'Section Sud-Est',  regions: ['84', '93', '76', '94'] },
  NORD_EST: { nom: 'Section Nord-Est', regions: ['44', '32', '11', '27'] },
};

export const PIECES = {
  attestation_maire: 'Attestation du maire',
  plan_cadastral: 'Plan cadastral',
  releve_bathymetrique: 'Relevé bathymétrique',
  certificat_enneigement: "Certificat d'enneigement",
  photo_facade: 'Photographie de la façade',
};

// Objets de demande. `premisse` = déclaration qui doit être VRAIE pour être éligible.
export const OBJETS = {
  attestation: {
    libelle: () => 'Attestation de conformité territoriale',
    court: 'Attestation', montant: false, premisse: null,
  },
  aide_littoral: {
    libelle: () => "Fonds d'aide aux communes littorales",
    court: 'Fonds littoral', montant: true,
    premisse: () => ({ type: 'littoral', valeur: true }),
  },
  crue: {
    libelle: (o) => `Plan de prévention des crues ${duCoursEau(o.fleuve)}`,
    court: 'Plan crues', montant: true,
    premisse: (o) => ({ type: 'fleuve', valeur: o.fleuve }),
  },
  montagne: {
    libelle: (o) => `Dotation neige et montagne (${o.massif})`,
    court: 'Dotation montagne', montant: true,
    premisse: (o) => ({ type: 'massif', valeur: o.massif }),
  },
  prefecture: {
    libelle: () => "Ravalement de l'hôtel de préfecture",
    court: 'Ravalement préfecture', montant: true,
    premisse: () => ({ type: 'prefecture', valeur: true }),
  },
  rattachement: {
    libelle: (o) => `Rattachement au département ${libDep(o.dep)}`,
    court: 'Rattachement', montant: false, premisse: null,
  },
};

export const ARTICLES = [
  { num: 1, texte: 'Les demandes de rattachement à un autre département sont irrecevables. Elles sont refusées.' },
  { num: 2, texte: "Le guichet ne traite que les communes des régions de sa section. Tout autre dossier est transféré à la région compétente." },
  { num: 3, texte: "Une demande dont la condition d'éligibilité repose sur une information fausse est refusée." },
  { num: 4, texte: "Une erreur de déclaration qui ne conditionne pas la demande est rectifiée par l'agent." },
  { num: 5, texte: "Le code INSEE de l'extrait de registre commence par le numéro du département de la commune. Sinon, la pièce est non conforme : refus." },
];

export function texteDecret(d) {
  switch (d.type) {
    case 'seuil_piece':
      return `Toute demande d'un montant supérieur à ${d.seuil.toLocaleString('fr-FR')} € doit être accompagnée d'une pièce « ${PIECES[d.piece]} ».`;
    case 'piece_objet':
      return `Toute demande « ${OBJETS[d.objet].court} » doit comporter une pièce « ${PIECES[d.piece]} ».`;
    case 'objet_suspendu':
      return `Les demandes « ${OBJETS[d.objet].court} » sont suspendues jusqu'à nouvel ordre : refus.`;
    default: return '???';
  }
}

export const premisse = (objet) => OBJETS[objet.type].premisse?.(objet) ?? null;
const memeDecl = (a, b) => a.type === b.type && a.valeur === b.valeur;

// ——— Validation : un dossier n'est jouable que si tout y est décidable.
export function valider(dossier) {
  const err = [];
  const c = COMMUNE_PAR_INSEE[dossier.insee];
  if (!c) return [`Commune inconnue : ${dossier.insee}`];
  const o = dossier.objet;
  if (!OBJETS[o?.type]) err.push(`Objet inconnu : ${o?.type}`);
  if (o?.type === 'crue' && !COURS_EAU[o.fleuve]) err.push(`Cours d'eau inconnu : ${o.fleuve}`);
  if (o?.type === 'montagne' && !MASSIFS[o.massif]) err.push(`Massif inconnu : ${o.massif}`);
  if (o?.type === 'rattachement' && (!DEPARTEMENTS[o.dep] || o.dep === c.dep)) err.push('Rattachement invalide');

  dossier.declarations.forEach((d, i) => {
    const e = evaluer(c, d);
    if (e.statut === 'indecidable') err.push(`Déclaration d${i} indécidable — ${e.explication}`);
  });
  const p = OBJETS[o?.type] ? premisse(o) : null;
  if (p) {
    if (evaluer(c, p).statut === 'indecidable') err.push('Condition de la demande indécidable');
    if (!dossier.declarations.some((d) => memeDecl(d, p))) err.push('La condition de la demande doit figurer parmi les déclarations');
  }
  const ins = dossier.registre?.insee;
  if (!ins || ins.length !== c.insee.length) err.push('Extrait de registre invalide');
  else if (ins !== c.insee && ins.slice(0, c.dep.length) === c.dep)
    err.push('Registre falsifié mais indétectable (même préfixe départemental)');
  if (OBJETS[o?.type]?.montant && typeof dossier.montant !== 'number') err.push('Montant manquant');
  return err;
}

// ——— Décision de référence
// contexte = { regions: [codes région de la section], decrets: [...] }
export function decider(dossier, contexte) {
  const c = COMMUNE_PAR_INSEE[dossier.insee];
  const reg = regionDe(c);
  const evals = dossier.declarations.map((d) => evaluer(c, d));
  const anomalies = new Set();
  const explications = [];
  evals.forEach((e, i) => {
    if (e.statut === 'faux') { anomalies.add(`d${i}`); explications.push(e.explication); }
  });

  // Article 2 — compétence
  if (!contexte.regions.includes(reg)) {
    return {
      decision: 'TRANSFERER', destination: reg, anomalies, explications,
      motifs: [`${c.nom} est en ${REGIONS[reg]}, hors de la compétence du guichet : transfert vers ${REGIONS[reg]} (art. 2).`],
      note: c.note,
    };
  }

  const refus = [];
  const o = dossier.objet;
  if (o.type === 'rattachement')
    refus.push(`Demande de rattachement à un autre département : irrecevable (art. 1).`);

  const p = premisse(o);
  if (p && evaluer(c, p).statut === 'faux')
    refus.push(`La demande « ${OBJETS[o.type].court} » repose sur une information fausse (art. 3).`);

  if (dossier.registre.insee !== c.insee) {
    anomalies.add('registre');
    refus.push(`L'extrait de registre porte le code INSEE ${dossier.registre.insee} : il devrait commencer par ${c.dep}. Pièce non conforme (art. 5).`);
  }

  const pieces = dossier.pieces ?? [];
  for (const d of contexte.decrets ?? []) {
    if (d.type === 'seuil_piece' && OBJETS[o.type].montant && dossier.montant > d.seuil && !pieces.includes(d.piece)) {
      anomalies.add('pieces');
      refus.push(`Montant de ${dossier.montant.toLocaleString('fr-FR')} € sans « ${PIECES[d.piece]} » : décret du jour non respecté.`);
    }
    if (d.type === 'piece_objet' && o.type === d.objet && !pieces.includes(d.piece)) {
      anomalies.add('pieces');
      refus.push(`Demande « ${OBJETS[o.type].court} » sans « ${PIECES[d.piece]} » : décret du jour non respecté.`);
    }
    if (d.type === 'objet_suspendu' && o.type === d.objet)
      refus.push(`Les demandes « ${OBJETS[o.type].court} » sont suspendues par décret.`);
  }

  if (refus.length) return { decision: 'REFUSER', anomalies, explications, motifs: refus, note: c.note };
  if (anomalies.size)
    return {
      decision: 'RECTIFIER', anomalies, explications, note: c.note,
      motifs: ["Erreur(s) de déclaration sans effet sur l'éligibilité : rectification (art. 4)."],
    };
  return { decision: 'ACCEPTER', anomalies, explications, motifs: ['Dossier conforme.'], note: c.note };
}

// ——— Notation d'une réponse du joueur
// reponse = { decision, destination?, signalements: Set<string> }
export function noter(reference, reponse) {
  const bonne = reference.decision === reponse.decision;
  let justification = false;
  if (bonne && reference.decision === 'TRANSFERER') justification = reponse.destination === reference.destination;
  else if (bonne) {
    const a = reference.anomalies, s = reponse.signalements;
    justification = a.size === s.size && [...a].every((x) => s.has(x));
  }
  return { bonne, justification, points: bonne ? (justification ? 15 : 10) : 0 };
}
