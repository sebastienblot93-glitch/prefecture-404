// Évaluation d'une déclaration face au référentiel.
// Retourne { statut: 'vrai' | 'faux' | 'indecidable', explication }
import { DEPARTEMENTS, REGIONS, CHEFS_LIEUX } from '../data/territoires.js';
import { COURS_EAU, MASSIFS, MERS, duCoursEau } from '../data/geographie.js';

export const regionDe = (commune) => DEPARTEMENTS[commune.dep].region;
export const libDep = (code) => `${DEPARTEMENTS[code]?.nom ?? '??'} (${code})`;

export const prefectureDu = (dep) => CHEFS_LIEUX[dep] ?? null;

const r = (statut, explication = '') => ({ statut, explication });

export function evaluer(commune, decl) {
  const n = commune.nom;
  const v = decl.valeur;
  const reg = regionDe(commune);

  switch (decl.type) {
    case 'dep':
      if (!DEPARTEMENTS[v]) return r('indecidable', `Département inconnu : ${v}`);
      return commune.dep === v
        ? r('vrai')
        : r('faux', `${n} dépend du département ${libDep(commune.dep)}, et non ${libDep(v)}.`);

    case 'region':
      if (!REGIONS[v]) return r('indecidable', `Région inconnue : ${v}`);
      return reg === v
        ? r('vrai')
        : r('faux', `${n} est en région ${REGIONS[reg]}, et non ${REGIONS[v]}.`);

    case 'littoral':
      if (commune.littoral === null) return r('indecidable', `Littoral de ${n} non certifié.`);
      if (v === commune.littoral) return r('vrai');
      return r('faux', commune.littoral
        ? `${n} est bien une commune littorale.`
        : `${n} n'a aucune façade maritime.`);

    case 'mer':
      if (!MERS[v]) return r('indecidable', `Mer inconnue : ${v}`);
      if (commune.littoral === false)
        return r('faux', `${n} n'est bordée par aucune mer.`);
      if (commune.littoral === true && commune.mer)
        return commune.mer === v
          ? r('vrai')
          : r('faux', `${n} est bordée par ${MERS[commune.mer].libelle}, pas par ${MERS[v].libelle}.`);
      return r('indecidable', `Mer bordante de ${n} non certifiée.`);

    case 'fleuve': {
      const ce = COURS_EAU[v];
      if (!ce) return r('indecidable', `Cours d'eau inconnu : ${v}`);
      if (commune.fleuves.includes(v)) return r('vrai');
      if (ce.regions && !ce.regions.includes(reg)) {
        const vrais = commune.fleuves.length
          ? ` Elle est au bord ${commune.fleuves.map(duCoursEau).join(' et ')}.`
          : '';
        return r('faux', `${n} n'est pas au bord ${duCoursEau(v)}, qui ne passe pas en ${REGIONS[reg]}.${vrais}`);
      }
      return r('indecidable', `Rapport entre ${n} et ${v} non certifié.`);
    }

    case 'massif': {
      const m = MASSIFS[v];
      if (!m) return r('indecidable', `Massif inconnu : ${v}`);
      if (commune.massif === v) return r('vrai');
      if (typeof commune.massif === 'string')
        return r('faux', `${n} n'est pas dans ${m.libelle}, mais dans ${MASSIFS[commune.massif].libelle}.`);
      if (commune.massif === false || !m.regions.includes(reg))
        return r('faux', `${n} n'est pas située dans ${m.libelle}.`);
      return r('indecidable', `Rapport entre ${n} et ${v} non certifié.`);
    }

    case 'prefecture': {
      if (v === commune.prefecture) return r('vrai');
      if (commune.prefecture)
        return r('faux', `${n} est bien le chef-lieu (préfecture) du département ${libDep(commune.dep)}.`);
      const p = prefectureDu(commune.dep);
      return r('faux', `${n} n'est pas chef-lieu de département${p ? ` : la préfecture de ${libDep(commune.dep)} est ${p}` : ''}.`);
    }

    default:
      return r('indecidable', `Type de déclaration inconnu : ${decl.type}`);
  }
}

// Libellés affichés sur le formulaire
export function libelleDeclaration(decl) {
  const v = decl.valeur;
  switch (decl.type) {
    case 'dep': return ['Département', libDep(v)];
    case 'region': return ['Région', REGIONS[v] ?? v];
    case 'littoral': return ['Commune littorale', v ? 'Oui' : 'Non'];
    case 'mer': return ['Mer bordante', MERS[v]?.libelle ?? v];
    case 'fleuve': return ["Cours d'eau", `Traversée ou longée par ${COURS_EAU[v]?.article === "l'" ? "l'" : (COURS_EAU[v]?.article ?? '') + ' '}${v}`];
    case 'massif': return ['Zone de montagne', `Massif : ${v}`];
    case 'prefecture': return ['Chef-lieu de département', v ? 'Oui' : 'Non'];
    default: return [decl.type, String(v)];
  }
}
