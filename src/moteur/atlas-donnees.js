// Contenu de l'atlas, sous forme de lignes : la même source sert à l'affichage
// (src/ui/atlas.js) et aux épingles du jeu en ligne, dont le texte est
// reconstruit ici côté serveur (un joueur ne peut pas épingler un texte inventé).
// Les communes en zone grise n'apparaissent ni dans « oui » ni dans « non ».
import { REGIONS, DEPARTEMENTS, CHEFS_LIEUX } from '../data/territoires.js';
import { COMMUNES, COMMUNE_PAR_INSEE } from '../data/communes.js';
import { COURS_EAU, MASSIFS, MERS, duCoursEau } from '../data/geographie.js';

const tri = (a, b) => a.localeCompare(b, 'fr');
const parNom = [...COMMUNES].sort((a, b) => tri(a.nom, b.nom));
const regionsDe = (codes) => codes.map((r) => REGIONS[r]).sort(tri).join(', ');
const nomMassif = (m) => MASSIFS[m].libelle.replace(/^(les|le) /, '');

export const ONGLETS = {
  communes: {
    titre: 'Communes',
    sections: () => [{
      aide: 'Index alphabétique : commune → département.',
      colonnes: ['Commune', 'Dép.'],
      lignes: parNom.map((c) => ({ cle: c.insee, cellules: [c.nom, c.dep], texte: `${c.nom} : département ${c.dep}` })),
    }],
  },
  departements: {
    titre: 'Départements',
    sections: () => [{
      aide: 'Numéro → département → région.',
      colonnes: ['N°', 'Département', 'Région'],
      lignes: Object.entries(DEPARTEMENTS).map(([code, d]) => ({
        cle: code, cellules: [code, d.nom, REGIONS[d.region]], texte: `${code} ${d.nom} : région ${REGIONS[d.region]}`,
      })),
    }],
  },
  prefectures: {
    titre: 'Préfectures',
    sections: () => [{
      aide: "Chef-lieu de chaque département. Une commune absente de cette liste n'est pas une préfecture.",
      colonnes: ['N°', 'Département', 'Préfecture'],
      lignes: Object.entries(DEPARTEMENTS).filter(([code]) => CHEFS_LIEUX[code]).map(([code, d]) => ({
        cle: code, cellules: [code, d.nom, CHEFS_LIEUX[code]], texte: `Préfecture du ${code} ${d.nom} : ${CHEFS_LIEUX[code]}`,
      })),
    }],
  },
  littoral: {
    titre: 'Littoral',
    sections: () => [{
      aide: 'Communes bordées par la mer, et communes sans façade maritime.',
      colonnes: ['Commune', 'Façade maritime'],
      lignes: parNom.filter((c) => c.littoral !== null).map((c) => {
        const v = c.littoral ? (c.mer ? MERS[c.mer].libelle : 'oui, mer non arrêtée') : 'aucune';
        return {
          cle: c.insee, cellules: [c.nom, v],
          texte: c.littoral ? `${c.nom} : bordée par ${c.mer ? MERS[c.mer].libelle : 'la mer'}` : `${c.nom} : sans façade maritime`,
        };
      }),
    }],
  },
  fleuves: {
    titre: "Cours d'eau",
    sections: () => [
      {
        aide: 'Communes riveraines répertoriées.',
        colonnes: ["Cours d'eau", 'Commune'],
        lignes: Object.keys(COURS_EAU).sort(tri).flatMap((f) => parNom.filter((c) => c.fleuves.includes(f)).map((c) => ({
          cle: `${f}|${c.insee}`, cellules: [f, c.nom], texte: `${c.nom} est au bord ${duCoursEau(f)}`,
        }))),
      },
      {
        aide: "Régions traversées ou longées. Un cours d'eau ne passe dans aucune autre région.",
        colonnes: ["Cours d'eau", 'Régions'],
        lignes: Object.entries(COURS_EAU).filter(([, f]) => f.regions).sort(([a], [b]) => tri(a, b)).map(([n, f]) => ({
          cle: `regions|${n}`, cellules: [n, regionsDe(f.regions)], texte: `Régions ${duCoursEau(n)} : ${regionsDe(f.regions)}`,
        })),
      },
    ],
  },
  massifs: {
    titre: 'Montagne',
    sections: () => [
      {
        aide: 'Communes situées dans un massif, et communes hors de tout massif.',
        colonnes: ['Massif', 'Commune'],
        lignes: [
          ...Object.keys(MASSIFS).flatMap((m) => parNom.filter((c) => c.massif === m).map((c) => ({
            cle: `${m}|${c.insee}`, cellules: [nomMassif(m), c.nom], texte: `${c.nom} est dans ${MASSIFS[m].libelle}`,
          }))),
          ...parNom.filter((c) => c.massif === false).map((c) => ({
            cle: `hors|${c.insee}`, cellules: ['Hors massif', c.nom], texte: `${c.nom} : hors de tout massif`,
          })),
        ],
      },
      {
        aide: 'Régions concernées par chaque massif.',
        colonnes: ['Massif', 'Régions'],
        lignes: Object.entries(MASSIFS).map(([m, x]) => ({
          cle: `regions|${m}`, cellules: [nomMassif(m), regionsDe(x.regions)], texte: `Régions ${x.libelle.replace(/^les /, 'des ').replace(/^le /, 'du ')} : ${regionsDe(x.regions)}`,
        })),
      },
    ],
  },
};

export const CLES_ONGLETS = Object.keys(ONGLETS);

const index = new Map();
for (const [k, o] of Object.entries(ONGLETS))
  for (const s of o.sections()) for (const l of s.lignes) index.set(`${k}/${l.cle}`, l.texte);

// Texte officiel d'une ligne d'atlas (ou null si la ligne n'existe pas)
export const texteLigne = (onglet, cle) => index.get(`${onglet}/${cle}`) ?? null;

// Onglets utiles pour vérifier un dossier
export function ongletsUtiles(dossier) {
  const u = new Set(['communes', 'departements']); // compétence (région réelle) et registre
  for (const d of dossier.declarations) {
    if (d.type === 'prefecture') u.add('prefectures');
    if (d.type === 'littoral' || d.type === 'mer') u.add('littoral');
    if (d.type === 'fleuve') u.add('fleuves');
    if (d.type === 'massif') u.add('massifs');
  }
  return u;
}

export { COMMUNE_PAR_INSEE };
