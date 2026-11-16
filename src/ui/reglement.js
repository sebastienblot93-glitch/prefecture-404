import { ARTICLES, SECTIONS, texteDecret } from '../moteur/regles.js';
import { REGIONS } from '../data/territoires.js';

export function htmlReglement(contexte) {
  const s = SECTIONS[contexte.section];
  const decrets = contexte.decrets ?? [];
  return `
    <h3 class="regl-titre">Règlement du guichet</h3>
    <p class="regl-section"><strong>${s.nom}</strong><br>
      Régions de compétence : ${s.regions.map((r) => REGIONS[r]).join(', ')}.</p>
    <ol class="regl-articles">
      ${ARTICLES.map((a) => `<li value="${a.num}">${a.texte}</li>`).join('')}
    </ol>
    <p class="regl-def">Au sens du présent règlement, une commune littorale est une commune bordée par la mer.</p>
    <h3 class="regl-titre">Décrets du jour</h3>
    ${decrets.length
      ? `<ul class="regl-decrets">${decrets.map((d, i) => `<li><span class="regl-num">Décret n° 404-${i + 1}</span> ${texteDecret(d)}</li>`).join('')}</ul>`
      : '<p class="regl-vide">Aucun décret particulier aujourd\'hui.</p>'}
    <h3 class="regl-titre">Ordre d'examen</h3>
    <p class="regl-ordre">Compétence (transférer) → irrecevabilité ou fausse condition (refuser) → erreur sans effet (rectifier) → conforme (accepter).</p>`;
}
