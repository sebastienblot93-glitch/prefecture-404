#!/usr/bin/env node
// Serveur de Préfecture 404 : sert le jeu (fichiers statiques) et les salons en ligne.
// Aucune dépendance : Node 20+ suffit. Démarrage : node server/serveur.mjs
//
// API
//   GET  /api/sante                          → { ok: true }
//   POST /api/salons            {pseudo}     → { code, jeton }         crée un salon
//   POST /api/salons/:code/rejoindre {pseudo} → { code, jeton }        rejoint un salon
//   GET  /api/salons/:code/flux?jeton=…      → flux SSE de l'état vu par ce joueur
//   POST /api/salons/:code/action {jeton, type, …}                     action de jeu
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Salon, ErreurSalon, nouveauCode } from './salon.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLICS = ['index.html', 'salon.html', 'atlas.html', 'src', 'styles'];
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.json': 'application/json; charset=utf-8', '.ico': 'image/x-icon',
};
const INACTIVITE_MAX = 2 * 60 * 60 * 1000; // un salon sans activité depuis 2 h est fermé

const salons = new Map();       // code -> Salon
const flux = new Map();         // code -> Set<{ joueur, res }>

// ——— Utilitaires HTTP
function json(res, statut, corps) {
  res.writeHead(statut, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(corps));
}

function lireCorps(req) {
  return new Promise((ok, ko) => {
    let n = 0; const morceaux = [];
    req.on('data', (m) => { n += m.length; if (n > 10_000) { ko(new ErreurSalon('Requête trop volumineuse.')); req.destroy(); } else morceaux.push(m); });
    req.on('end', () => {
      try { ok(morceaux.length ? JSON.parse(Buffer.concat(morceaux).toString('utf8')) : {}); }
      catch { ko(new ErreurSalon('Requête illisible.')); }
    });
    req.on('error', ko);
  });
}

async function servirFichier(req, res, chemin) {
  const rel = decodeURIComponent(chemin === '/' ? '/index.html' : chemin).replace(/^\/+/, '');
  const absolu = path.resolve(RACINE, rel);
  const premier = rel.split('/')[0];
  if (!absolu.startsWith(RACINE + path.sep) || !PUBLICS.includes(premier)) return json(res, 404, { erreur: 'Introuvable.' });
  try {
    const s = await stat(absolu);
    if (!s.isFile()) throw new Error();
    const type = TYPES[path.extname(absolu)] ?? 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' });
    res.end(await readFile(absolu));
  } catch {
    json(res, 404, { erreur: 'Introuvable.' });
  }
}

// ——— Diffusion
function diffuser(salon) {
  const abonnes = flux.get(salon.code);
  if (!abonnes) return;
  for (const a of abonnes) {
    if (!salon.joueurs.includes(a.joueur)) { a.res.end(); abonnes.delete(a); continue; }
    a.res.write(`data: ${JSON.stringify(salon.vuePour(a.joueur.id))}\n\n`);
  }
}

function ouvrirFlux(req, res, salon, joueur) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  res.write('retry: 2000\n\n');
  const abonne = { joueur, res };
  if (!flux.has(salon.code)) flux.set(salon.code, new Set());
  flux.get(salon.code).add(abonne);
  salon.connexion(joueur, true);
  diffuser(salon);
  req.on('close', () => {
    flux.get(salon.code)?.delete(abonne);
    const encore = [...(flux.get(salon.code) ?? [])].some((a) => a.joueur === joueur);
    if (!encore) { salon.connexion(joueur, false); diffuser(salon); }
  });
}

// ——— Routage
async function api(req, res, url) {
  const m = url.pathname.match(/^\/api\/salons(?:\/([A-Z]{4}))?(?:\/(rejoindre|flux|action))?$/i);
  if (url.pathname === '/api/sante') return json(res, 200, { ok: true, salons: salons.size });
  if (!m) return json(res, 404, { erreur: 'Route inconnue.' });
  const code = m[1]?.toUpperCase();
  const route = m[2];

  if (!code && req.method === 'POST') {
    const corps = await lireCorps(req);
    const salon = new Salon(nouveauCode(new Set(salons.keys())));
    salons.set(salon.code, salon);
    const j = salon.rejoindre(corps.pseudo);
    return json(res, 201, { code: salon.code, jeton: j.jeton });
  }

  const salon = code && salons.get(code);
  if (!salon) return json(res, 404, { erreur: `Aucun salon ${code ?? ''}. Vérifiez le code.` });

  if (route === 'rejoindre' && req.method === 'POST') {
    const corps = await lireCorps(req);
    const j = salon.rejoindre(corps.pseudo);
    diffuser(salon);
    return json(res, 200, { code: salon.code, jeton: j.jeton });
  }
  if (route === 'flux' && req.method === 'GET') {
    const joueur = salon.parJeton(url.searchParams.get('jeton'));
    if (!joueur) return json(res, 403, { erreur: "Vous ne faites pas partie de ce salon." });
    return ouvrirFlux(req, res, salon, joueur);
  }
  if (route === 'action' && req.method === 'POST') {
    const corps = await lireCorps(req);
    const joueur = salon.parJeton(corps.jeton);
    if (!joueur) return json(res, 403, { erreur: "Vous ne faites pas partie de ce salon." });
    salon.agir(joueur, corps);
    diffuser(salon);
    return json(res, 200, { ok: true });
  }
  return json(res, 405, { erreur: 'Méthode non permise.' });
}

export function creerServeur() {
  const serveur = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://local');
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { erreur: 'Méthode non permise.' });
      return await servirFichier(req, res, url.pathname);
    } catch (e) {
      if (e instanceof ErreurSalon) return json(res, 400, { erreur: e.message });
      console.error(e);
      if (!res.headersSent) json(res, 500, { erreur: 'Erreur interne du Bureau.' });
    }
  });

  // Horloge des salons, battement de cœur SSE, ménage
  let battement = 0;
  const minuterie = setInterval(() => {
    battement++;
    for (const [code, salon] of salons) {
      if (salon.tic() || battement % 2 === 0) diffuser(salon);
      if (battement % 20 === 0) {
        for (const a of flux.get(code) ?? []) a.res.write(': battement\n\n');
        salon.nettoyer();
        if (Date.now() - salon.activite > INACTIVITE_MAX && !(flux.get(code)?.size)) { salons.delete(code); flux.delete(code); }
      }
    }
  }, 500);
  serveur.on('close', () => clearInterval(minuterie));
  return serveur;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const port = Number(process.env.PORT) || 8404;
  creerServeur().listen(port, () => console.log(`Préfecture 404 ouverte sur http://localhost:${port}`));
}
