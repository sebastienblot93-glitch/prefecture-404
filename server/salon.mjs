// Logique d'un salon de jeu en ligne (sans réseau : testable directement).
// Le serveur est l'unique arbitre : il détient les dossiers, applique le moteur
// et n'envoie à chaque joueur QUE ce que son poste lui permet de voir.
import { randomUUID } from 'node:crypto';
import { COMMUNE_PAR_INSEE } from '../src/data/communes.js';
import { REGIONS } from '../src/data/territoires.js';
import { libelleDeclaration } from '../src/moteur/verite.js';
import { OBJETS, PIECES, SECTIONS, LIBELLE_DECISION, DECISIONS, decider, noter } from '../src/moteur/regles.js';
import { creerHasard } from '../src/moteur/hasard.js';
import { genererDossier } from '../src/moteur/generateur.js';
import { genererAppel } from '../src/moteur/telephone.js';
import { conseilErreur } from '../src/moteur/pedagogie.js';
import { JOURNEES, contexteDe } from '../src/campagne/journees.js';
import { contexteInfini, nouvelleGraine } from '../src/campagne/infini.js';

export const POSTES = {
  2: ['guichet', 'geographe'],
  3: ['guichet', 'geographe', 'inspecteur'],
};
export const NOM_POSTE = { guichet: 'Agent de guichet', geographe: 'Géographe', inspecteur: 'Inspecteur' };
const DELAI_OPPOSITION = 4000;   // ms pendant lesquelles l'inspecteur peut bloquer un tampon
const DUREE_APPEL = 15000;       // ms pour répondre au téléphone (temps de jeu)
const MAX_JOUEURS = 3;

export class ErreurSalon extends Error {}
const refuser = (m) => { throw new ErreurSalon(m); };

export class Salon {
  constructor(code, maintenant = () => Date.now()) {
    this.code = code;
    this.maintenant = maintenant;
    this.joueurs = [];
    this.hoteId = null;
    this.config = { partie: '1', graine: '', rotation: 2 };
    this.phase = 'attente';
    this.partie = null;
    this.activite = maintenant();
    this.version = 0;
  }

  // ——— Joueurs
  rejoindre(pseudo) {
    pseudo = String(pseudo ?? '').trim().slice(0, 20) || 'Agent anonyme';
    if (this.phase === 'jeu') refuser('Une partie est en cours dans ce salon. Attendez la fin de la journée.');
    if (this.joueurs.length >= MAX_JOUEURS) refuser('Ce salon est complet (3 joueurs maximum).');
    if (this.joueurs.some((j) => j.pseudo.toLowerCase() === pseudo.toLowerCase())) pseudo += ` ${this.joueurs.length + 1}`;
    const j = { id: randomUUID().slice(0, 8), jeton: randomUUID(), pseudo, connecte: false };
    this.joueurs.push(j);
    this.hoteId ??= j.id;
    this.toucher();
    return j;
  }

  parJeton(jeton) { return this.joueurs.find((j) => j.jeton === jeton) ?? null; }

  connexion(joueur, etat) {
    joueur.connecte = etat;
    if (!etat && this.phase !== 'jeu') {
      // hors partie, un joueur déconnecté libère sa place après coup (voir nettoyer())
      joueur.parti = this.maintenant();
    } else delete joueur.parti;
    this.toucher();
  }

  nettoyer() {
    // Retire les joueurs déconnectés depuis plus de 60 s hors partie
    const t = this.maintenant();
    const avant = this.joueurs.length;
    if (this.phase !== 'jeu') this.joueurs = this.joueurs.filter((j) => j.connecte || !j.parti || t - j.parti < 60000);
    if (!this.joueurs.some((j) => j.id === this.hoteId)) this.hoteId = this.joueurs[0]?.id ?? null;
    if (this.joueurs.length !== avant) this.toucher();
  }

  posteDe(id) {
    const p = this.partie;
    if (!p) return null;
    const i = p.equipe.indexOf(id);
    if (i < 0) return null;
    const postes = POSTES[p.equipe.length];
    return postes[(i + p.decalage) % postes.length];
  }

  joueurAuPoste(poste) {
    return this.partie?.equipe.find((id) => this.posteDe(id) === poste) ?? null;
  }

  toucher() { this.version++; this.activite = this.maintenant(); }

  // ——— Actions
  agir(joueur, a) {
    const t = this.maintenant();
    const estHote = joueur.id === this.hoteId || !this.joueurs.find((j) => j.id === this.hoteId)?.connecte;
    const p = this.partie;
    const poste = this.posteDe(joueur.id);
    switch (a?.type) {
      case 'config': {
        if (!estHote) refuser("Seul l'hôte règle la partie.");
        if (this.phase === 'jeu') refuser('Partie en cours.');
        if (['1', '2', '3', 'infini'].includes(String(a.partie))) this.config.partie = String(a.partie);
        if (typeof a.graine === 'string') this.config.graine = a.graine.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
        if ([0, 1, 2, 3, 4].includes(Number(a.rotation))) this.config.rotation = Number(a.rotation);
        break;
      }
      case 'demarrer': {
        if (!estHote) refuser("Seul l'hôte lance la partie.");
        if (this.phase === 'jeu') refuser('Partie déjà en cours.');
        const presents = this.joueurs.filter((j) => j.connecte);
        if (presents.length < 2) refuser('Il faut au moins deux joueurs connectés.');
        this.lancer(presents.map((j) => j.id));
        break;
      }
      case 'commencer': {
        if (!p || p.etape !== 'intro') refuser('Rien à commencer.');
        p.etape = 'examen';
        p.dernierTic = t;
        break;
      }
      case 'signaler': {
        if (!p || p.etape !== 'examen') refuser('Pas de dossier en examen.');
        if (poste !== 'geographe') refuser('Seul le géographe annote les déclarations.');
        const cibles = this.dossier().declarations.map((_, i) => `d${i}`);
        if (!cibles.includes(a.cible)) refuser('Ligne inconnue.');
        if (p.signalements.has(a.cible)) p.signalements.delete(a.cible); else p.signalements.add(a.cible);
        break;
      }
      case 'signaler-piece': {
        // Registre et pièces : annotés par celui qui les a sous les yeux
        if (!p || p.etape !== 'examen') refuser('Pas de dossier en examen.');
        if (!['registre', 'pieces'].includes(a.cible)) refuser('Élément inconnu.');
        const titulaire = this.joueurAuPoste('inspecteur') ? 'inspecteur' : 'guichet';
        if (poste !== titulaire) refuser("Cette pièce n'est pas sur votre bureau.");
        if (p.signalements.has(a.cible)) p.signalements.delete(a.cible); else p.signalements.add(a.cible);
        break;
      }
      case 'tamponner': {
        if (!p || p.etape !== 'examen') refuser('Pas de dossier en examen.');
        if (poste !== 'guichet') refuser('Seul le guichet tient les tampons.');
        if (!DECISIONS.includes(a.decision)) refuser('Tampon inconnu.');
        if (a.decision === 'TRANSFERER' && !REGIONS[a.destination]) refuser('Choisissez une région de destination.');
        p.tampon = { decision: a.decision, destination: a.decision === 'TRANSFERER' ? a.destination : null };
        if (this.joueurAuPoste('inspecteur')) {
          p.etape = 'validation';
          p.tampon.jusqua = t + DELAI_OPPOSITION;
        } else this.resoudre();
        break;
      }
      case 'opposition': {
        if (!p || p.etape !== 'validation') refuser("Aucun tampon en cours de validation.");
        if (poste !== 'inspecteur') refuser("Seul l'inspecteur peut faire opposition.");
        p.oppositions++;
        p.annonce = { texte: `Opposition de l'inspecteur ! Le tampon « ${LIBELLE_DECISION[p.tampon.decision]} » est annulé.`, t };
        p.tampon = null;
        p.etape = 'examen';
        p.dernierTic = t;
        break;
      }
      case 'repondre': {
        if (!p?.appel) refuser("Personne au bout du fil.");
        if (poste !== 'geographe') refuser('Le téléphone sonne chez le géographe.');
        const juste = Boolean(a.oui) === p.appel.reponse;
        if (juste) { p.score += 3; p.appels.bons++; } else { p.credibilite -= 5; p.appels.rates++; }
        p.annonce = { texte: `${juste ? 'Bonne réponse au téléphone : +3 points.' : 'Mauvaise réponse au téléphone : crédibilité −5.'} ${p.appel.explication}`, t, ton: juste ? 'ok' : 'ko' };
        p.appel = null;
        p.prochainAppel = p.ecoule + this.delaiAppel();
        break;
      }
      case 'suivant': {
        if (!p || p.etape !== 'correction') refuser('Rien à passer.');
        this.suivant();
        break;
      }
      case 'salle': {
        if (!estHote) refuser("Seul l'hôte peut ramener l'équipe en salle d'attente.");
        if (this.phase !== 'bilan') refuser('La partie est en cours.');
        this.phase = 'attente';
        this.partie = null;
        break;
      }
      default: refuser('Action inconnue.');
    }
    this.toucher();
  }

  // ——— Déroulé
  lancer(equipe) {
    const c = this.config;
    let cfg;
    if (c.partie === 'infini') {
      const graine = c.graine || nouvelleGraine();
      this.config.graine = graine;
      const ctx = contexteInfini(graine);
      cfg = {
        mode: 'infini', contexte: ctx, hasard: creerHasard(`dossiers-${graine}`), dossiers: [],
        titre: `Mode infini, graine ${graine}`, duree: null,
        intro: "L'administration est en surchauffe : les dossiers ne s'arrêtent jamais. Tenez jusqu'à épuisement de votre crédibilité.",
      };
    } else {
      const j = JOURNEES.find((x) => String(x.id) === c.partie);
      cfg = {
        mode: 'campagne', journee: j.id, contexte: contexteDe(j), dossiers: j.dossiers,
        titre: j.titre, intro: j.intro, duree: Math.round(j.duree * 1.6) * 1000,
      };
    }
    this.phase = 'jeu';
    this.partie = {
      ...cfg, equipe, decalage: 0, index: 0, score: 0, credibilite: 100,
      etape: 'intro', ecoule: 0, dernierTic: this.maintenant(),
      signalements: new Set(), tampon: null, correction: null, resultats: [],
      appel: null, prochainAppel: 20000, appels: { bons: 0, rates: 0 }, oppositions: 0,
      hasardAppels: creerHasard(`appels-${this.code}-${this.maintenant()}`),
      annonce: null,
    };
    if (cfg.mode === 'infini') this.partie.dossiers.push(genererDossier(cfg.hasard, cfg.contexte, 3, 1));
  }

  dossier() { return this.partie.dossiers[this.partie.index]; }
  delaiAppel() { return this.partie.hasardAppels.entier(22, 40) * 1000; }

  resoudre() {
    const p = this.partie;
    const d = this.dossier();
    const ref = decider(d, p.contexte);
    const { decision, destination } = p.tampon;
    const note = noter(ref, { decision, destination, signalements: p.signalements });
    const penalite = note.bonne ? 0 : d.conseil ? 0 : p.mode === 'campagne' ? 12 : 20;
    p.score += note.points;
    p.credibilite -= penalite;
    const c = COMMUNE_PAR_INSEE[d.insee];
    p.resultats.push({ commune: c.nom, decision, attendu: ref.decision, destination: ref.destination ?? null, points: note.points, justification: note.justification });
    p.correction = {
      bonne: note.bonne, justification: note.justification, points: note.points, penalite,
      decision, destination, attendu: ref.decision, destinationAttendue: ref.destination ?? null,
      explications: [...ref.explications, ...ref.motifs], note: c.note,
      lecon: conseilErreur(d, ref, decision),
      dossier: this.dossierComplet(d, ref),
    };
    p.tampon = null;
    p.etape = 'correction';
  }

  suivant() {
    const p = this.partie;
    if (p.credibilite <= 0) return this.finir('credibilite');
    p.index++;
    if (p.mode === 'campagne' && p.index >= p.dossiers.length) return this.finir('fini');
    if (p.mode === 'infini' && p.index >= p.dossiers.length)
      p.dossiers.push(genererDossier(p.hasard, p.contexte, 3, p.index + 1));
    p.signalements = new Set();
    p.correction = null;
    p.etape = 'examen';
    p.dernierTic = this.maintenant();
    const r = this.config.rotation;
    if (r > 0 && p.index % r === 0) {
      p.decalage++;
      p.annonce = {
        texte: `Changement de poste ! ${p.equipe.map((id) => `${this.pseudo(id)} : ${NOM_POSTE[this.posteDe(id)]}`).join(' · ')}`,
        t: this.maintenant(), ton: 'rotation',
      };
    }
  }

  finir(raison) {
    this.phase = 'bilan';
    this.partie.etape = 'bilan';
    this.partie.raison = raison;
    this.partie.appel = null;
  }

  pseudo(id) { return this.joueurs.find((j) => j.id === id)?.pseudo ?? '?'; }

  // Avance le temps de jeu. Retourne true si l'état a changé.
  tic() {
    const p = this.partie;
    if (this.phase !== 'jeu' || !p) return false;
    const t = this.maintenant();
    let change = false;
    if (p.etape === 'validation' && t >= p.tampon.jusqua) { this.resoudre(); change = true; }
    if (p.etape === 'examen' || p.etape === 'validation') {
      const dt = Math.max(0, t - (p.dernierTic ?? t));
      p.ecoule += dt;
      change = true;
      if (p.duree && p.ecoule >= p.duree) { this.finir('retard'); this.toucher(); return true; }
      if (this.joueurAuPoste('geographe')) {
        if (p.appel && p.ecoule >= p.appel.jusqua) {
          p.credibilite -= 5; p.appels.rates++;
          p.annonce = { texte: `Le téléphone a sonné dans le vide : crédibilité −5. ${p.appel.explication}`, t, ton: 'ko' };
          p.appel = null;
          p.prochainAppel = p.ecoule + this.delaiAppel();
        } else if (!p.appel && p.ecoule >= p.prochainAppel) {
          p.appel = { ...genererAppel(p.hasardAppels), jusqua: p.ecoule + DUREE_APPEL, id: randomUUID().slice(0, 6) };
        }
      }
      if (p.credibilite <= 0 && p.etape === 'examen') { this.finir('credibilite'); }
    }
    p.dernierTic = t;
    if (change) this.toucher();
    return change;
  }

  // ——— Vues
  dossierComplet(d, ref) {
    const c = COMMUNE_PAR_INSEE[d.insee];
    return {
      commune: c.nom,
      objet: OBJETS[d.objet.type].libelle(d.objet),
      condition: OBJETS[d.objet.type].condition(d.objet),
      montant: d.montant,
      declarations: d.declarations.map((x, i) => {
        const [label, valeur] = libelleDeclaration(x);
        return { cible: `d${i}`, label, valeur, anomalie: ref?.anomalies.has(`d${i}`) ?? false };
      }),
      pieces: d.pieces.map((x) => PIECES[x]),
      registre: { nom: c.nom.toUpperCase(), insee: d.registre.insee },
      anomaliesPieces: ref ? ['registre', 'pieces'].filter((k) => ref.anomalies.has(k)) : [],
    };
  }

  vuePour(joueurId) {
    const moi = this.joueurs.find((j) => j.id === joueurId);
    const p = this.partie;
    const v = {
      code: this.code,
      phase: this.phase,
      moi: { id: moi.id, pseudo: moi.pseudo, poste: this.posteDe(moi.id) },
      hote: moi.id === this.hoteId,
      hoteId: this.hoteId,
      joueurs: this.joueurs.map((j) => ({ id: j.id, pseudo: j.pseudo, connecte: j.connecte, poste: this.posteDe(j.id) })),
      config: this.config,
      journees: JOURNEES.map((j) => ({ id: String(j.id), titre: j.titre })),
    };
    if (!p) return v;

    const section = SECTIONS[p.contexte.section];
    const inspecteur = Boolean(this.joueurAuPoste('inspecteur'));
    v.partie = {
      titre: p.titre, intro: p.intro, mode: p.mode, etape: p.etape,
      section: section.nom, contexte: { section: p.contexte.section, decrets: p.contexte.decrets },
      index: p.index, total: p.mode === 'campagne' ? p.dossiers.length : null,
      score: p.score, credibilite: Math.max(0, p.credibilite),
      horloge: this.horloge(), tard: p.duree ? p.ecoule / p.duree > 0.8 : false,
      annonce: p.annonce && this.maintenant() - p.annonce.t < 9000 ? p.annonce : null,
      nbSignalements: p.signalements.size,
      inspecteur,
      rotation: this.config.rotation,
      prochaineRotation: this.config.rotation ? this.config.rotation - (p.index % this.config.rotation) : null,
    };
    if (p.etape === 'correction') v.partie.correction = p.correction;
    if (p.etape === 'validation') v.partie.validation = {
      decision: p.tampon.decision, destination: p.tampon.destination,
      resteMs: Math.max(0, p.tampon.jusqua - this.maintenant()),
    };
    if (this.phase === 'bilan') v.partie.bilan = {
      raison: p.raison, resultats: p.resultats, appels: p.appels, oppositions: p.oppositions,
    };

    if (p.etape === 'examen' || p.etape === 'validation') {
      const d = this.dossier();
      const c = COMMUNE_PAR_INSEE[d.insee];
      const poste = v.moi.poste;
      const titulairePieces = inspecteur ? 'inspecteur' : 'guichet';
      const bureau = {};
      if (poste === 'guichet') {
        Object.assign(bureau, {
          ref: d.id, commune: c.nom, objet: OBJETS[d.objet.type].libelle(d.objet),
          condition: OBJETS[d.objet.type].condition(d.objet), montant: d.montant,
          demandeur: d.demandeur, mot: d.mot, conseil: d.conseil ?? null,
        });
      }
      if (poste === 'geographe') {
        bureau.declarations = d.declarations.map((x, i) => {
          const [label, valeur] = libelleDeclaration(x);
          return { cible: `d${i}`, label, valeur, signale: p.signalements.has(`d${i}`) };
        });
        if (p.appel) bureau.appel = {
          id: p.appel.id, appelant: p.appel.appelant, texte: p.appel.texte,
          resteMs: Math.max(0, p.appel.jusqua - p.ecoule),
        };
      }
      if (poste === titulairePieces) {
        Object.assign(bureau, {
          montant: d.montant,
          pieces: d.pieces.map((x) => PIECES[x]),
          registre: { nom: c.nom.toUpperCase(), insee: d.registre.insee },
          reglement: true,
          signalementsPieces: ['registre', 'pieces'].filter((k) => p.signalements.has(k)),
        });
      }
      v.partie.bureau = bureau;
    }
    return v;
  }

  horloge() {
    const p = this.partie;
    if (p.duree) {
      const m = 9 * 60 + Math.min(1, p.ecoule / p.duree) * 8 * 60;
      return `${String(Math.floor(m / 60)).padStart(2, '0')} h ${String(Math.floor(m % 60)).padStart(2, '0')}`;
    }
    const s = Math.floor(p.ecoule / 1000);
    return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`;
  }
}

const LETTRES = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export function nouveauCode(existants) {
  for (;;) {
    const code = Array.from({ length: 4 }, () => LETTRES[Math.floor(Math.random() * LETTRES.length)]).join('');
    if (!existants.has(code)) return code;
  }
}
