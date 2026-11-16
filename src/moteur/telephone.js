// Standard téléphonique du géographe : des appels arrivent pendant qu'il aide
// le guichet. Chaque question est une déclaration CERTAINE (vraie ou fausse),
// produite par les mêmes règles que les dossiers.
import { COMMUNES } from '../data/communes.js';
import { REGIONS } from '../data/territoires.js';
import { MASSIFS, MERS, duCoursEau } from '../data/geographie.js';
import { evaluer, regionDe, libDep } from './verite.js';
import { fausser } from './generateur.js';

export const APPELANTS = [
  'Un touriste égaré', 'Mamie Odette', 'Une élève de CM2 qui fait ses devoirs',
  'Le facteur remplaçant', 'Un journaliste de la presse locale', 'Un chauffeur de car scolaire',
  'Un candidat à un jeu télévisé', 'Le cousin du maire', 'Une agence de voyages pressée',
  'Un pigeon voyageur (traduit)',
];

function vraie(h, c, type) {
  switch (type) {
    case 'dep': return { type, valeur: c.dep };
    case 'region': return { type, valeur: regionDe(c) };
    case 'fleuve': return c.fleuves.length ? { type, valeur: h.choisir(c.fleuves) } : null;
    case 'massif': return typeof c.massif === 'string' ? { type, valeur: c.massif } : null;
    case 'mer': return c.littoral === true && c.mer ? { type, valeur: c.mer } : null;
    default: return null;
  }
}

function question(c, d) {
  const n = c.nom;
  switch (d.type) {
    case 'dep': return `${n}, c'est bien dans le département ${libDep(d.valeur)} ?`;
    case 'region': return `${n}, c'est bien en région ${REGIONS[d.valeur]} ?`;
    case 'prefecture': return `${n}, c'est la préfecture de son département ?`;
    case 'littoral': return `${n}, il y a la mer là-bas ?`;
    case 'fleuve': return `${n}, c'est au bord ${duCoursEau(d.valeur)} ?`;
    case 'massif': return `${n}, c'est dans ${MASSIFS[d.valeur].libelle} ?`;
    case 'mer': return `${n}, c'est au bord de ${MERS[d.valeur].libelle} ?`;
    default: return '?';
  }
}

export function genererAppel(h) {
  const types = ['dep', 'dep', 'region', 'region', 'prefecture', 'littoral', 'fleuve', 'massif', 'mer'];
  for (let i = 0; i < 100; i++) {
    const c = h.choisir(COMMUNES);
    const type = h.choisir(types);
    let d;
    if (type === 'prefecture' || type === 'littoral') d = { type, valeur: true };
    else d = h.chance(0.5) ? vraie(h, c, type) : fausser(h, c, type);
    if (!d) continue;
    const e = evaluer(c, d);
    if (e.statut === 'indecidable') continue;
    return {
      appelant: h.choisir(APPELANTS),
      texte: question(c, d),
      reponse: e.statut === 'vrai',
      explication: e.statut === 'vrai' ? 'La réponse était oui.' : `La réponse était non. ${e.explication}`,
    };
  }
  throw new Error('Standard : aucune question certaine trouvée');
}
