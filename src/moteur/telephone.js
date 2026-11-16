// Standard téléphonique : des questions BONUS de culture géographique, dont la
// réponse n'est pas dans l'atlas. Facultatif : bonne réponse = bonus,
// mauvaise réponse ou appel ignoré = rien.
import { CULTURE } from '../data/culture.js';

export const APPELANTS = [
  'Un touriste égaré', 'Mamie Odette', 'Une élève de CM2 qui fait ses devoirs',
  'Le facteur remplaçant', 'Un journaliste de la presse locale', 'Un chauffeur de car scolaire',
  'Un candidat à un jeu télévisé', 'Le cousin du maire', 'Une agence de voyages pressée',
  'Un pigeon voyageur (traduit)',
];
export const BONUS_APPEL = 5;

// `deja` : indices déjà posés dans la partie (pour éviter les répétitions)
export function genererAppel(h, deja = new Set()) {
  const libres = CULTURE.map((_, i) => i).filter((i) => !deja.has(i));
  const i = h.choisir(libres.length ? libres : CULTURE.map((_, k) => k));
  const q = CULTURE[i];
  const choix = h.melanger([q.bonne, ...q.faux]);
  return {
    numero: i,
    appelant: h.choisir(APPELANTS),
    texte: q.question,
    choix,
    bonne: choix.indexOf(q.bonne),
    explication: q.explication,
  };
}
