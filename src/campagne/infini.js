// Mode infini — « L'administration en surchauffe »
// Tout est dérivé d'une graine partageable : le guichet, le géographe et
// l'inspecteur ouvrent la même graine et voient la même journée.
import { creerHasard } from '../moteur/hasard.js';
import { SECTIONS } from '../moteur/regles.js';

export const DECRETS_POSSIBLES = [
  { type: 'seuil_piece', seuil: 50000, piece: 'attestation_maire' },
  { type: 'seuil_piece', seuil: 100000, piece: 'photo_facade' },
  { type: 'piece_objet', objet: 'crue', piece: 'plan_cadastral' },
  { type: 'piece_objet', objet: 'montagne', piece: 'certificat_enneigement' },
  { type: 'piece_objet', objet: 'aide_littoral', piece: 'releve_bathymetrique' },
  { type: 'objet_suspendu', objet: 'prefecture' },
  { type: 'objet_suspendu', objet: 'montagne' },
];

export function contexteInfini(graine) {
  const h = creerHasard(`contexte-${graine}`);
  const section = h.choisir(Object.keys(SECTIONS));
  const decrets = h.melanger(DECRETS_POSSIBLES)
    .filter((d, i, l) => l.findIndex((x) => x.type === d.type && x.objet && x.objet === d.objet) === i)
    .slice(0, 2);
  return { section, regions: SECTIONS[section].regions, decrets };
}

export const nouvelleGraine = () => Math.random().toString(36).slice(2, 7).toUpperCase();
