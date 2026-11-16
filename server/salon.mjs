// Logique d'un salon de jeu en ligne (sans réseau : testable directement).
//
// Principe « bureau partagé » : tous les joueurs voient le même dossier et les
// mêmes annotations en direct. Ce qui les distingue, c'est l'ATLAS : ses six
// onglets sont répartis entre les joueurs, et la répartition change à chaque
// dossier. On se transmet les informations en ÉPINGLANT des lignes d'atlas sur
// le dossier commun (pas besoin de parler). Un tampon n'est valide qu'avec une
// DOUBLE SIGNATURE : un joueur le propose, un autre le contresigne.
import { randomUUID } from 'node:crypto';
import { COMMUNE_PAR_INSEE } from '../src/data/communes.js';
import { REGIONS } from '../src/data/territoires.js';
import { libelleDeclaration } from '../src/moteur/verite.js';
import { OBJETS, PIECES, SECTIONS, LIBELLE_DECISION, DECISIONS, decider, noter } from '../src/moteur/regles.js';
import { creerHasard } from '../src/moteur/hasard.js';
import { genererDossier } from '../src/moteur/generateur.js';
import { genererAppel, BONUS_APPEL } from '../src/moteur/telephone.js';
import { conseilErreur } from '../src/moteur/pedagogie.js';
import { CLES_ONGLETS, ONGLETS, ongletsUtiles, texteLigne } from '../src/moteur/atlas-donnees.js';
import { JOURNEES, contexteDe } from '../src/campagne/journees.js';
import { contexteInfini, nouvelleGraine } from '../src/campagne/infini.js';

const MAX_JOUEURS = 3;
const MAX_EPINGLES = 12;
const DUREE_APPEL = 20000;  // ms de jeu pour décrocher
export const COULEURS = ['bleu', 'vert', 'violet'];

export class ErreurSalon extends Error {}
const refuser = (m) => { throw new ErreurSalon(m); };

// Répartit les onglets : autant de joueurs que possible reçoivent un onglet utile
// au dossier (tous, s'il y a assez d'onglets utiles), et « Communes » /
// « Départements » sont chez deux joueurs différents
// (vérifier une région demande alors forcément une épingle du collègue).
export function repartir(dossier, equipe, h) {
  const utiles = ongletsUtiles(dossier);
  const n = equipe.length;
  let rep = null;
  for (let essai = 0; essai < 200; essai++) {
    const ordre = h.melanger(CLES_ONGLETS);
    const r = Object.fromEntries(equipe.map((id) => [id, []]));
    ordre.forEach((k, i) => r[equipe[i % n]].push(k));
    rep = r;
    const proprio = (k) => equipe.find((id) => r[id].includes(k));
    const servis = equipe.filter((id) => r[id].some((k) => utiles.has(k))).length;
    const chacunUtile = servis >= Math.min(n, utiles.size);
    if (chacunUtile && proprio('communes') !== proprio('departements')) break;
  }
  for (const id of equipe) rep[id].sort((a, b) => CLES_ONGLETS.indexOf(a) - CLES_ONGLETS.indexOf(b));
  return rep;
}

export class Salon {
  constructor(code, maintenant = () => Date.now()) {
    this.code = code;
    this.maintenant = maintenant;
    this.joueurs = [];
    this.hoteId = null;
    this.config = { partie: '1', graine: '' };
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
    const libre = COULEURS.find((c) => !this.joueurs.some((j) => j.couleur === c));
    const j = { id: randomUUID().slice(0, 8), jeton: randomUUID(), pseudo, couleur: libre, connecte: false };
    this.joueurs.push(j);
    this.hoteId ??= j.id;
    this.toucher();
    return j;
  }

  parJeton(jeton) { return this.joueurs.find((j) => j.jeton === jeton) ?? null; }
  joueur(id) { return this.joueurs.find((j) => j.id === id) ?? null; }
  pseudo(id) { return this.joueur(id)?.pseudo ?? '?'; }

  connexion(joueur, etat) {
    joueur.connecte = etat;
    if (!etat && this.phase !== 'jeu') joueur.parti = this.maintenant(); else delete joueur.parti;
    this.toucher();
  }

  nettoyer() {
    const t = this.maintenant();
    const avant = this.joueurs.length;
    if (this.phase !== 'jeu') this.joueurs = this.joueurs.filter((j) => j.connecte || !j.parti || t - j.parti < 60000);
    if (!this.joueurs.some((j) => j.id === this.hoteId)) this.hoteId = this.joueurs[0]?.id ?? null;
    if (this.joueurs.length !== avant) this.toucher();
  }

  toucher() { this.version++; this.activite = this.maintenant(); }

  // ——— Actions
  agir(joueur, a) {
    const t = this.maintenant();
    const estHote = joueur.id === this.hoteId || !this.joueur(this.hoteId)?.connecte;
    const p = this.partie;
    const enExamen = () => { if (!p || p.etape !== 'examen') refuser('Pas de dossier en examen.'); };
    const dansEquipe = () => { if (!p?.equipe.includes(joueur.id)) refuser("Vous n'êtes pas dans l'équipe de cette partie."); };

    // Partie en pause : tout est gelé, sauf la reprise
    if (p?.pause && this.phase === 'jeu' && a?.type !== 'pause') refuser("La partie est en pause. Seul l'hôte peut la reprendre.");

    switch (a?.type) {
      case 'pause': {
        if (joueur.id !== this.hoteId) refuser("Seul l'hôte peut mettre la partie en pause.");
        if (this.phase !== 'jeu' || !p) refuser('Aucune partie en cours.');
        if (p.pause) {
          p.pause = null;
          p.dernierTic = t;
          p.annonce = { texte: `${joueur.pseudo} a repris la partie.`, t, ton: 'neutre' };
        } else {
          p.pause = { par: joueur.pseudo };
        }
        break;
      }
      case 'config': {
        if (!estHote) refuser("Seul l'hôte règle la partie.");
        if (this.phase === 'jeu') refuser('Partie en cours.');
        if (['1', '2', '3', 'infini'].includes(String(a.partie))) this.config.partie = String(a.partie);
        if (typeof a.graine === 'string') this.config.graine = a.graine.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
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
        enExamen(); dansEquipe();
        const cibles = [...this.dossier().declarations.map((_, i) => `d${i}`), 'registre', 'pieces'];
        if (!cibles.includes(a.cible)) refuser('Élément inconnu.');
        if (p.signalements.has(a.cible)) p.signalements.delete(a.cible); else p.signalements.set(a.cible, joueur.id);
        break;
      }
      case 'epingler': {
        enExamen(); dansEquipe();
        if (!p.repartition[joueur.id].includes(a.onglet)) refuser("Cet onglet n'est pas dans votre atlas pour ce dossier.");
        const texte = texteLigne(a.onglet, String(a.cle ?? ''));
        if (!texte) refuser("Ligne d'atlas introuvable.");
        if (p.epingles.some((e) => e.texte === texte)) return; // déjà épinglée
        if (p.epingles.length >= MAX_EPINGLES) refuser(`Pas plus de ${MAX_EPINGLES} épingles par dossier : retirez-en une.`);
        p.epingles.push({ id: randomUUID().slice(0, 6), onglet: a.onglet, texte, par: joueur.id });
        break;
      }
      case 'depingler': {
        enExamen(); dansEquipe();
        p.epingles = p.epingles.filter((e) => e.id !== a.id);
        break;
      }
      case 'proposer': {
        enExamen(); dansEquipe();
        if (!DECISIONS.includes(a.decision)) refuser('Tampon inconnu.');
        if (a.decision === 'TRANSFERER' && !REGIONS[a.destination]) refuser('Choisissez une région de destination.');
        p.proposition = { decision: a.decision, destination: a.decision === 'TRANSFERER' ? a.destination : null, par: joueur.id };
        break;
      }
      case 'contresigner': {
        enExamen(); dansEquipe();
        if (!p.proposition) refuser('Aucun tampon à contresigner.');
        if (p.proposition.par === joueur.id) refuser('Un tampon doit être contresigné par un collègue.');
        p.proposition.contresigne = joueur.id;
        this.resoudre();
        break;
      }
      case 'contester': {
        enExamen(); dansEquipe();
        if (!p.proposition) refuser('Aucun tampon à contester.');
        if (p.proposition.par === joueur.id) refuser('Retirez plutôt votre propre proposition.');
        p.contestations++;
        p.annonce = { texte: `${joueur.pseudo} conteste le tampon « ${LIBELLE_DECISION[p.proposition.decision]} » proposé par ${this.pseudo(p.proposition.par)}.`, t, ton: 'ko' };
        p.proposition = null;
        break;
      }
      case 'retirer': {
        enExamen();
        if (p.proposition?.par !== joueur.id) refuser("Ce n'est pas votre proposition.");
        p.proposition = null;
        break;
      }
      case 'repondre': {
        if (!p?.appel) refuser('Personne au bout du fil.');
        dansEquipe();
        const juste = Number(a.choix) === p.appel.bonne;
        if (juste) { p.score += BONUS_APPEL; p.appels.bons++; } else p.appels.faux++;
        p.annonce = {
          texte: `${joueur.pseudo} a répondu au téléphone : ${juste ? `bonne réponse, +${BONUS_APPEL} points !` : 'raté (aucune pénalité).'} ${p.appel.explication}`,
          t, ton: juste ? 'ok' : 'neutre',
        };
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
    const graineSalon = `${this.code}-${this.maintenant()}`;
    this.phase = 'jeu';
    this.partie = {
      ...cfg, equipe, index: 0, score: 0, credibilite: 100,
      etape: 'intro', ecoule: 0, dernierTic: this.maintenant(),
      signalements: new Map(), epingles: [], proposition: null, correction: null, resultats: [],
      repartition: null, hasardRepartition: creerHasard(`repartition-${graineSalon}`),
      appel: null, prochainAppel: 25000, appelsPoses: new Set(), appels: { bons: 0, faux: 0, ignores: 0 },
      hasardAppels: creerHasard(`appels-${graineSalon}`), contestations: 0, annonce: null, pause: null,
    };
    if (cfg.mode === 'infini') this.partie.dossiers.push(genererDossier(cfg.hasard, cfg.contexte, 3, 1));
    this.partie.repartition = repartir(this.dossier(), equipe, this.partie.hasardRepartition);
  }

  dossier() { return this.partie.dossiers[this.partie.index]; }
  delaiAppel() { return this.partie.hasardAppels.entier(30, 50) * 1000; }

  resoudre() {
    const p = this.partie;
    const d = this.dossier();
    const ref = decider(d, p.contexte);
    const { decision, destination, par, contresigne } = p.proposition;
    const note = noter(ref, { decision, destination, signalements: new Set(p.signalements.keys()) });
    const penalite = note.bonne ? 0 : d.conseil ? 0 : p.mode === 'campagne' ? 12 : 20;
    p.score += note.points;
    p.credibilite -= penalite;
    const c = COMMUNE_PAR_INSEE[d.insee];
    p.resultats.push({ commune: c.nom, decision, attendu: ref.decision, destination: ref.destination ?? null, points: note.points, justification: note.justification });
    p.correction = {
      bonne: note.bonne, justification: note.justification, points: note.points, penalite,
      decision, destination, attendu: ref.decision, destinationAttendue: ref.destination ?? null,
      signataires: [this.pseudo(par), this.pseudo(contresigne)],
      explications: [...ref.explications, ...ref.motifs], note: c.note,
      lecon: conseilErreur(d, ref, decision),
      anomalies: [...ref.anomalies],
    };
    p.proposition = null;
    p.etape = 'correction';
  }

  suivant() {
    const p = this.partie;
    if (p.credibilite <= 0) return this.finir('credibilite');
    p.index++;
    if (p.mode === 'campagne' && p.index >= p.dossiers.length) return this.finir('fini');
    if (p.mode === 'infini' && p.index >= p.dossiers.length)
      p.dossiers.push(genererDossier(p.hasard, p.contexte, 3, p.index + 1));
    p.signalements = new Map();
    p.epingles = [];
    p.correction = null;
    p.etape = 'examen';
    p.dernierTic = this.maintenant();
    p.repartition = repartir(this.dossier(), p.equipe, p.hasardRepartition);
  }

  finir(raison) {
    this.phase = 'bilan';
    this.partie.etape = 'bilan';
    this.partie.raison = raison;
    this.partie.pause = null;
    if (this.partie.appel) this.partie.appel = null;
  }

  // Avance le temps de jeu. Retourne true si l'état a changé.
  tic() {
    const p = this.partie;
    if (this.phase !== 'jeu' || !p) return false;
    const t = this.maintenant();
    if (p.pause || p.etape !== 'examen') { p.dernierTic = t; return false; }
    p.ecoule += Math.max(0, t - (p.dernierTic ?? t));
    p.dernierTic = t;
    if (p.duree && p.ecoule >= p.duree) { this.finir('retard'); this.toucher(); return true; }
    if (p.appel && p.ecoule >= p.appel.jusqua) {
      p.appels.ignores++;
      p.annonce = { texte: `Personne n'a décroché (aucune pénalité). ${p.appel.explication}`, t, ton: 'neutre' };
      p.appel = null;
      p.prochainAppel = p.ecoule + this.delaiAppel();
    } else if (!p.appel && p.ecoule >= p.prochainAppel) {
      const a = genererAppel(p.hasardAppels, p.appelsPoses);
      p.appelsPoses.add(a.numero);
      p.appel = { ...a, jusqua: p.ecoule + DUREE_APPEL, id: randomUUID().slice(0, 6) };
    }
    this.toucher();
    return true;
  }

  // ——— Vue (identique pour tous, sauf « mes onglets »)
  vuePour(joueurId) {
    const moi = this.joueur(joueurId);
    const p = this.partie;
    const v = {
      code: this.code,
      phase: this.phase,
      moi: { id: moi.id, pseudo: moi.pseudo, couleur: moi.couleur },
      hote: moi.id === this.hoteId,
      hoteId: this.hoteId,
      joueurs: this.joueurs.map((j) => ({ id: j.id, pseudo: j.pseudo, couleur: j.couleur, connecte: j.connecte })),
      config: this.config,
      journees: JOURNEES.map((j) => ({ id: String(j.id), titre: j.titre })),
    };
    if (!p) return v;

    const couleur = (id) => this.joueur(id)?.couleur ?? 'bleu';
    v.partie = {
      titre: p.titre, intro: p.intro, mode: p.mode, etape: p.etape,
      section: SECTIONS[p.contexte.section].nom, contexte: { section: p.contexte.section, decrets: p.contexte.decrets },
      index: p.index, total: p.mode === 'campagne' ? p.dossiers.length : null,
      score: p.score, credibilite: Math.max(0, p.credibilite),
      horloge: this.horloge(), tard: p.duree ? p.ecoule / p.duree > 0.8 : false,
      pause: p.pause ?? null,
      annonce: p.annonce && this.maintenant() - p.annonce.t < 10000 ? p.annonce : null,
      mesOnglets: p.repartition?.[moi.id] ?? [],
      repartition: p.equipe.map((id) => ({
        id, pseudo: this.pseudo(id), couleur: couleur(id),
        onglets: (p.repartition?.[id] ?? []).map((k) => ONGLETS[k].titre),
        cles: p.repartition?.[id] ?? [],
      })),
    };
    if (this.phase === 'bilan') {
      v.partie.bilan = { raison: p.raison, resultats: p.resultats, appels: p.appels, contestations: p.contestations };
      return v;
    }
    if (p.etape === 'intro') return v;

    const d = this.dossier();
    const c = COMMUNE_PAR_INSEE[d.insee];
    const signe = (k) => (p.signalements.has(k) ? couleur(p.signalements.get(k)) : null);
    v.partie.dossier = {
      ref: d.id, commune: c.nom, objet: OBJETS[d.objet.type].libelle(d.objet),
      condition: OBJETS[d.objet.type].condition(d.objet), montant: d.montant,
      demandeur: d.demandeur, mot: d.mot, conseil: d.conseil ?? null,
      declarations: d.declarations.map((x, i) => {
        const [label, valeur] = libelleDeclaration(x);
        return { cible: `d${i}`, label, valeur, signale: signe(`d${i}`) };
      }),
      pieces: d.pieces.map((x) => PIECES[x]), piecesSignale: signe('pieces'),
      registre: { nom: c.nom.toUpperCase(), insee: d.registre.insee, signale: signe('registre') },
    };
    v.partie.epingles = p.epingles.map((e) => ({ id: e.id, texte: e.texte, pseudo: this.pseudo(e.par), couleur: couleur(e.par) }));
    if (p.proposition) v.partie.proposition = {
      decision: p.proposition.decision, destination: p.proposition.destination,
      parMoi: p.proposition.par === moi.id, pseudo: this.pseudo(p.proposition.par), couleur: couleur(p.proposition.par),
    };
    if (p.appel) v.partie.appel = {
      id: p.appel.id, appelant: p.appel.appelant, texte: p.appel.texte, choix: p.appel.choix,
      resteMs: Math.max(0, p.appel.jusqua - p.ecoule),
    };
    if (p.etape === 'correction') v.partie.correction = p.correction;
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
