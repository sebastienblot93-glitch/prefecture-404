// Générateur de dossiers à partir de règles explicites.
// Il vise un verdict, construit le dossier en n'utilisant QUE des faits certains,
// puis fait recalculer le verdict par le moteur (regles.decider) : en cas de
// désaccord le dossier est jeté et regénéré. Le verdict affiché au joueur vient
// toujours du moteur, jamais du générateur.
import { COMMUNES } from '../data/communes.js';
import { DEPARTEMENTS, REGIONS } from '../data/territoires.js';
import { COURS_EAU, MASSIFS, MERS } from '../data/geographie.js';
import { evaluer, regionDe } from './verite.js';
import { OBJETS, PIECES, premisse, decider, valider } from './regles.js';
import { DEMANDEURS, MOTS } from './folklore.js';

const DEPS_METRO = Object.keys(DEPARTEMENTS).filter((d) => d.length === 2);
const REGIONS_METRO = Object.keys(REGIONS).filter((r) => DEPS_METRO.some((d) => DEPARTEMENTS[d].region === r));
const certain = (c, d, statut) => evaluer(c, d).statut === statut;

// Objets dont la condition est VRAIE pour la commune
function objetsEligibles(c, niveau) {
  const l = [{ type: 'attestation' }];
  if (c.littoral === true) l.push({ type: 'aide_littoral' });
  if (niveau >= 2) {
    for (const f of c.fleuves) if (COURS_EAU[f]) l.push({ type: 'crue', fleuve: f });
    if (typeof c.massif === 'string') l.push({ type: 'montagne', massif: c.massif });
    if (c.prefecture) l.push({ type: 'prefecture' });
  }
  return l;
}

// Objets dont la condition est certainement FAUSSE pour la commune
function objetsInegibles(c, niveau) {
  const l = [];
  if (c.littoral === false) l.push({ type: 'aide_littoral' });
  if (niveau >= 2) {
    for (const f of Object.keys(COURS_EAU))
      if (certain(c, { type: 'fleuve', valeur: f }, 'faux')) l.push({ type: 'crue', fleuve: f });
    for (const m of Object.keys(MASSIFS))
      if (certain(c, { type: 'massif', valeur: m }, 'faux')) l.push({ type: 'montagne', massif: m });
    if (!c.prefecture) l.push({ type: 'prefecture' });
  }
  return l;
}

// Valeur certainement fausse pour un type de déclaration
function fausser(h, c, type) {
  const essais = {
    dep: () => (h.chance(0.5)
      ? h.choisir(DEPS_METRO.filter((d) => d !== c.dep && DEPARTEMENTS[d].region === regionDe(c)))
      : h.choisir(DEPS_METRO.filter((d) => d !== c.dep))),
    region: () => h.choisir(REGIONS_METRO.filter((r) => r !== regionDe(c))),
    prefecture: () => !c.prefecture,
    littoral: () => !c.littoral,
    mer: () => h.choisir(Object.keys(MERS).filter((m) => m !== c.mer)),
    fleuve: () => h.choisir(Object.keys(COURS_EAU)),
    massif: () => h.choisir(Object.keys(MASSIFS)),
  };
  for (let i = 0; i < 20; i++) {
    const valeur = essais[type]?.();
    if (valeur === undefined) return null;
    const d = { type, valeur };
    if (certain(c, d, 'faux')) return d;
  }
  return null;
}

function declarationsVraies(h, c, niveau) {
  const d = [{ type: 'dep', valeur: c.dep }, { type: 'region', valeur: regionDe(c) }];
  if (niveau < 2) return d;
  const options = [];
  options.push({ type: 'prefecture', valeur: c.prefecture });
  if (c.littoral === true && c.mer) options.push({ type: 'mer', valeur: c.mer });
  if (c.littoral === false) options.push({ type: 'littoral', valeur: false });
  if (c.fleuves.length) options.push({ type: 'fleuve', valeur: h.choisir(c.fleuves) });
  if (typeof c.massif === 'string') options.push({ type: 'massif', valeur: c.massif });
  return [...d, ...h.melanger(options).slice(0, h.entier(0, 2))];
}

function forgerInsee(h, c) {
  const autres = DEPS_METRO.filter((d) => d !== c.dep && !d.startsWith('2'));
  return h.choisir(autres) + c.insee.slice(2);
}

const POIDS = { ACCEPTER: 32, RECTIFIER: 26, REFUSER: 27, TRANSFERER: 15 };

export function genererDossier(h, contexte, niveau = 3, numero = 1) {
  for (let essai = 0; essai < 200; essai++) {
    const cible = h.pondere(POIDS);
    const dossier = tenter(h, contexte, niveau, cible, numero);
    if (!dossier) continue;
    if (valider(dossier).length) continue;
    if (decider(dossier, contexte).decision !== cible) continue;
    return dossier;
  }
  throw new Error('Générateur : impossible de produire un dossier cohérent');
}

function tenter(h, ctx, niveau, cible, numero) {
  const dedans = COMMUNES.filter((c) => ctx.regions.includes(regionDe(c)));
  const dehors = COMMUNES.filter((c) => !ctx.regions.includes(regionDe(c)));
  const c = h.choisir(cible === 'TRANSFERER' ? dehors : dedans);
  const decrets = ctx.decrets ?? [];
  const suspendus = decrets.filter((d) => d.type === 'objet_suspendu').map((d) => d.objet);

  let objet;
  let mode = null;
  if (cible === 'REFUSER') {
    const modes = ['premisse', 'premisse', 'rattachement'];
    if (niveau >= 2) modes.push('registre');
    if (decrets.length) modes.push('decret', 'decret');
    mode = h.choisir(modes);
    if (mode === 'premisse') {
      const l = objetsInegibles(c, niveau);
      if (!l.length) return null;
      objet = h.choisir(l);
    } else if (mode === 'rattachement') {
      objet = { type: 'rattachement', dep: h.choisir(DEPS_METRO.filter((d) => d !== c.dep)) };
    } else {
      objet = h.choisir(objetsEligibles(c, niveau));
    }
  } else {
    const l = objetsEligibles(c, niveau).filter((o) => !suspendus.includes(o.type));
    objet = h.choisir(l);
  }

  // Déclarations
  const declarations = declarationsVraies(h, c, niveau);
  const p = premisse(objet);
  if (p) {
    const i = declarations.findIndex((d) => d.type === p.type);
    if (i >= 0) declarations.splice(i, 1);
    declarations.push(p);
  }
  const nbErreurs =
    cible === 'RECTIFIER' ? (niveau >= 2 && h.chance(0.35) ? 2 : 1)
    : cible === 'ACCEPTER' ? 0
    : niveau >= 2 && h.chance(0.4) ? 1 : 0;
  const mutables = h.melanger(declarations.map((d, i) => i).filter((i) => !(p && declarations[i] === p)));
  let faites = 0;
  for (const i of mutables) {
    if (faites >= nbErreurs) break;
    const f = fausser(h, c, declarations[i].type);
    if (f) { declarations[i] = f; faites++; }
  }
  if (faites < nbErreurs) return null;

  // Montant et pièces
  const montant = OBJETS[objet.type].montant ? h.entier(1, 30) * 5000 : null;
  const pieces = new Set();
  let decretViole = null;
  if (mode === 'decret') {
    const applicables = decrets.filter((d) =>
      (d.type === 'seuil_piece' && montant !== null) ||
      (d.type === 'piece_objet' && d.objet === objet.type) ||
      (d.type === 'objet_suspendu' && d.objet === objet.type));
    if (!applicables.length) return null;
    decretViole = h.choisir(applicables);
  }
  let montantFinal = montant;
  for (const d of decrets) {
    if (d === decretViole) continue;
    if (d.type === 'seuil_piece' && montant !== null && (montant > d.seuil || h.chance(0.3))) pieces.add(d.piece);
    if (d.type === 'piece_objet' && d.objet === objet.type) pieces.add(d.piece);
  }
  if (decretViole?.type === 'seuil_piece') {
    montantFinal = decretViole.seuil + h.entier(1, 20) * 5000;
    pieces.delete(decretViole.piece);
  }
  if (h.chance(0.4)) pieces.add(h.choisir(Object.keys(PIECES)));
  if (decretViole && decretViole.type !== 'objet_suspendu') pieces.delete(decretViole.piece);

  return {
    id: `G${numero}`,
    insee: c.insee,
    demandeur: h.choisir(DEMANDEURS),
    mot: h.choisir(MOTS[objet.type]),
    objet,
    declarations,
    montant: montantFinal,
    pieces: [...pieces],
    registre: { insee: mode === 'registre' ? forgerInsee(h, c) : c.insee },
  };
}

export function genererJournee(h, contexte, niveau, nombre) {
  return Array.from({ length: nombre }, (_, i) => genererDossier(h, contexte, niveau, i + 1));
}
