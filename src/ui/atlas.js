// Atlas officiel. Organisé par thème (comme un vrai atlas) : l'index des
// communes ne donne QUE le département ; il faut croiser les tables.
// Options (jeu en ligne) :
//   onglets    : liste des onglets accessibles au joueur (les autres sont grisés)
//   proprietaires : { onglet: 'Bob' } pour indiquer qui détient un onglet absent
//   epingler(onglet, cle) : rend les lignes cliquables (épingler au dossier commun)
import { ONGLETS, CLES_ONGLETS } from '../moteur/atlas-donnees.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sansAccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const CODE = new Set(['N°', 'Dép.']);

export function monterAtlas(conteneur, options = {}) {
  let actif = null;
  let opts = options;
  conteneur.innerHTML = `
    <div class="atlas-onglets" role="tablist"></div>
    <label class="atlas-recherche"><span class="sr">Rechercher</span>
      <input type="search" placeholder="Rechercher…" autocomplete="off"></label>
    <div class="atlas-page" role="tabpanel"></div>`;
  const barre = conteneur.querySelector('.atlas-onglets');
  const page = conteneur.querySelector('.atlas-page');
  const champ = conteneur.querySelector('input');

  const accessible = (k) => !opts.onglets || opts.onglets.includes(k);

  function rendreOnglets() {
    barre.innerHTML = CLES_ONGLETS.map((k) => {
      const ok = accessible(k);
      const chez = !ok && opts.proprietaires?.[k] ? ` (chez ${esc(opts.proprietaires[k])})` : '';
      return `<button role="tab" class="atlas-onglet${ok ? '' : ' verrouille'}" data-onglet="${k}"
        aria-selected="${k === actif}" ${ok ? '' : 'disabled'} title="${ok ? '' : `Onglet détenu par un collègue${chez}`}">
        ${ONGLETS[k].titre}${chez ? `<span class="chez">${chez}</span>` : ''}</button>`;
    }).join('');
  }

  function afficher(k) {
    actif = k ?? null;
    rendreOnglets();
    if (!actif) { page.innerHTML = '<p class="atlas-aide">Aucun onglet pour le moment.</p>'; return; }
    const cliquable = Boolean(opts.epingler);
    page.innerHTML = ONGLETS[k].sections().map((s) => `
      <p class="atlas-aide">${esc(s.aide)}${cliquable ? ' Cliquez une ligne pour l\'épingler au dossier.' : ''}</p>
      <table class="atlas-table"><thead><tr>${s.colonnes.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>
      ${s.lignes.map((l) => `<tr data-cle="${esc(l.cle)}" data-recherche="${esc(sansAccent(l.cellules.join(' ')))}"${cliquable ? ' class="epinglable" tabindex="0"' : ''}>
        ${l.cellules.map((v, i) => `<td${CODE.has(s.colonnes[i]) ? ' class="code"' : ''}>${esc(v)}</td>`).join('')}</tr>`).join('')}
      </tbody></table>`).join('');
    page.scrollTop = 0;
    filtrer();
  }

  function filtrer() {
    const q = sansAccent(champ.value.trim());
    page.querySelectorAll('tr[data-recherche]').forEach((tr) => { tr.hidden = q && !tr.dataset.recherche.includes(q); });
  }

  barre.addEventListener('click', (e) => {
    const b = e.target.closest('[data-onglet]');
    if (b && !b.disabled) afficher(b.dataset.onglet);
  });
  const epingle = (tr) => {
    if (!tr || !opts.epingler) return;
    opts.epingler(actif, tr.dataset.cle);
    tr.classList.add('epinglee');
    setTimeout(() => tr.classList.remove('epinglee'), 700);
  };
  page.addEventListener('click', (e) => epingle(e.target.closest('tr.epinglable')));
  page.addEventListener('keydown', (e) => { if (e.key === 'Enter') epingle(e.target.closest('tr.epinglable')); });
  champ.addEventListener('input', filtrer);

  const premier = () => CLES_ONGLETS.find(accessible);
  afficher(premier());

  return {
    // Change les onglets accessibles (nouvelle répartition à chaque dossier)
    configurer(nouvelles) {
      opts = { ...opts, ...nouvelles };
      champ.value = '';
      afficher(accessible(actif) ? actif : premier());
    },
  };
}
