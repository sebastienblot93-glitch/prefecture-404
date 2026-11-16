// Explication ciblée d'une erreur : pourquoi CE tampon n'était pas le bon.
// Elle complète les explications factuelles de decider().
import { REGIONS } from '../data/territoires.js';
import { COMMUNE_PAR_INSEE } from '../data/communes.js';
import { regionDe } from './verite.js';
import { OBJETS } from './regles.js';

export function conseilErreur(dossier, ref, decision) {
  if (decision === ref.decision) return null;
  const c = COMMUNE_PAR_INSEE[dossier.insee];
  const reg = REGIONS[regionDe(c)];
  const o = OBJETS[dossier.objet.type];
  const cond = o.condition(dossier.objet);

  if (ref.decision === 'TRANSFERER')
    return `Première question à se poser : la commune est-elle dans ma section ? ${c.nom} est en ${reg}, hors section : on transfère, sans examiner le reste du dossier.`;
  if (decision === 'TRANSFERER') {
    const declRegion = dossier.declarations.find((d) => d.type === 'region');
    const piege = declRegion && REGIONS[declRegion.valeur] !== reg ? ' Ne vous fiez pas à la région déclarée : vérifiez la région réelle.' : '';
    return `${c.nom} est en ${reg}, une région de votre section : le dossier est pour vous.${piege}`;
  }
  if (ref.decision === 'REFUSER')
    return `Ici, la demande elle-même tombe (condition fausse, pièce non conforme ou règle non respectée). Rectifier ne suffit pas : une demande qui n'a pas droit d'exister se refuse.`;
  if (ref.decision === 'RECTIFIER' && decision === 'REFUSER')
    return `La condition de la demande (« ${cond} ») est remplie : l'erreur ne change rien au droit de la commune. On corrige la ligne fausse : Rectifier. Le refus est réservé aux demandes dont la condition est fausse ou que le règlement interdit.`;
  if (ref.decision === 'RECTIFIER' && decision === 'ACCEPTER')
    return `Une déclaration était fausse. Un dossier ne s'accepte que s'il est entièrement exact : signalez la ligne et rectifiez.`;
  if (ref.decision === 'ACCEPTER')
    return `Tout était exact et la condition (« ${cond} ») est remplie : rien à corriger, rien à refuser. On accepte.`;
  return null;
}
