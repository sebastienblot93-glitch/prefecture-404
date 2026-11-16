// Atlas officiel du géographe. Organisé par thème (comme un vrai atlas) :
// l'index des communes ne donne QUE le département ; il faut croiser les
// tables pour vérifier une région, un fleuve, un massif ou une préfecture.
// Les communes en zone grise n'apparaissent ni dans « oui » ni dans « non ».
import { REGIONS, DEPARTEMENTS, CHEFS_LIEUX } from '../data/territoires.js';
import { COMMUNES } from '../data/communes.js';
import { COURS_EAU, MASSIFS, MERS } from '../data/geographie.js';

const tri = (a, b) => a.localeCompare(b, 'fr');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sansAccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const listeRegions = (codes) => codes.map((r) => REGIONS[r]).sort(tri).join(', ');
const noms = (l) => l.map((c) => c.nom).sort(tri);

const ONGLETS = {
  communes: {
    titre: 'Communes',
    rendu: () => `
      <p class="atlas-aide">Index alphabétique. Pour la région, consultez la table des départements.</p>
      <table class="atlas-table filtrable"><thead><tr><th>Commune</th><th>Dép.</th></tr></thead><tbody>
      ${[...COMMUNES].sort((a, b) => tri(a.nom, b.nom)).map((c) =>
        `<tr data-cle="${esc(sansAccent(c.nom))}"><td>${esc(c.nom)}</td><td class="code">${c.dep}</td></tr>`).join('')}
      </tbody></table>`,
  },
  departements: {
    titre: 'Départements',
    rendu: () => `
      <table class="atlas-table filtrable"><thead><tr><th>N°</th><th>Département</th><th>Région</th></tr></thead><tbody>
      ${Object.entries(DEPARTEMENTS).map(([code, d]) =>
        `<tr data-cle="${esc(sansAccent(`${code} ${d.nom} ${REGIONS[d.region]}`))}"><td class="code">${code}</td><td>${esc(d.nom)}</td><td>${esc(REGIONS[d.region])}</td></tr>`).join('')}
      </tbody></table>`,
  },
  prefectures: {
    titre: 'Préfectures',
    rendu: () => `
      <p class="atlas-aide">Chef-lieu de chaque département. Une commune absente de cette liste n'est pas une préfecture.</p>
      <table class="atlas-table filtrable"><thead><tr><th>N°</th><th>Département</th><th>Préfecture</th></tr></thead><tbody>
      ${Object.entries(DEPARTEMENTS).filter(([code]) => CHEFS_LIEUX[code]).map(([code, d]) =>
        `<tr data-cle="${esc(sansAccent(`${code} ${d.nom} ${CHEFS_LIEUX[code]}`))}"><td class="code">${code}</td><td>${esc(d.nom)}</td><td>${esc(CHEFS_LIEUX[code])}</td></tr>`).join('')}
      </tbody></table>`,
  },
  littoral: {
    titre: 'Littoral',
    rendu: () => {
      const parMer = Object.keys(MERS).map((m) => {
        const l = noms(COMMUNES.filter((c) => c.littoral === true && c.mer === m));
        return `<dt>${esc(MERS[m].libelle)}</dt><dd>${l.map(esc).join(', ') || '—'}</dd>`;
      }).join('');
      const sansMer = noms(COMMUNES.filter((c) => c.littoral === true && !c.mer));
      const terre = noms(COMMUNES.filter((c) => c.littoral === false));
      return `
        <h4>Communes littorales, par mer bordante</h4><dl class="atlas-dl">${parMer}
        ${sansMer.length ? `<dt>Littorales, mer non arrêtée</dt><dd>${sansMer.map(esc).join(', ')}</dd>` : ''}</dl>
        <h4>Communes sans façade maritime</h4><p class="atlas-liste">${terre.map(esc).join(', ')}</p>`;
    },
  },
  fleuves: {
    titre: "Cours d'eau",
    rendu: () => Object.entries(COURS_EAU).sort(([a], [b]) => tri(a, b)).map(([nom, f]) => {
      const l = noms(COMMUNES.filter((c) => c.fleuves.includes(nom)));
      return `<div class="atlas-fiche"><h4>${esc(nom)}</h4>
        <p><span class="atlas-label">Régions traversées ou longées</span> ${f.regions ? esc(listeRegions(f.regions)) : '<em>non arrêtées</em>'}</p>
        <p><span class="atlas-label">Communes riveraines répertoriées</span> ${l.map(esc).join(', ') || '—'}</p></div>`;
    }).join(''),
  },
  massifs: {
    titre: 'Montagne',
    rendu: () => {
      const fiches = Object.entries(MASSIFS).map(([nom, m]) => {
        const l = noms(COMMUNES.filter((c) => c.massif === nom));
        return `<div class="atlas-fiche"><h4>${esc(m.libelle.replace(/^(les|le) /, ''))}</h4>
          <p><span class="atlas-label">Régions concernées</span> ${esc(listeRegions(m.regions))}</p>
          <p><span class="atlas-label">Communes du massif</span> ${l.map(esc).join(', ') || '—'}</p></div>`;
      }).join('');
      const hors = noms(COMMUNES.filter((c) => c.massif === false));
      return `${fiches}<h4>Communes hors de tout massif</h4><p class="atlas-liste">${hors.map(esc).join(', ')}</p>`;
    },
  },
};

export function monterAtlas(conteneur) {
  conteneur.innerHTML = `
    <div class="atlas-onglets" role="tablist">
      ${Object.entries(ONGLETS).map(([k, o], i) =>
        `<button role="tab" class="atlas-onglet" data-onglet="${k}" aria-selected="${i === 0}">${o.titre}</button>`).join('')}
    </div>
    <label class="atlas-recherche"><span class="sr">Rechercher</span>
      <input type="search" placeholder="Rechercher…" autocomplete="off"></label>
    <div class="atlas-page" role="tabpanel"></div>`;
  const page = conteneur.querySelector('.atlas-page');
  const champ = conteneur.querySelector('input');
  const afficher = (k) => {
    conteneur.querySelectorAll('.atlas-onglet').forEach((b) => b.setAttribute('aria-selected', b.dataset.onglet === k));
    page.innerHTML = ONGLETS[k].rendu();
    page.scrollTop = 0;
    filtrer();
  };
  const filtrer = () => {
    const q = sansAccent(champ.value.trim());
    page.querySelectorAll('tr[data-cle]').forEach((tr) => { tr.hidden = q && !tr.dataset.cle.includes(q); });
  };
  conteneur.querySelectorAll('.atlas-onglet').forEach((b) => b.addEventListener('click', () => afficher(b.dataset.onglet)));
  champ.addEventListener('input', filtrer);
  afficher('communes');
}
