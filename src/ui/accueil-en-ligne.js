// Accueil : créer ou rejoindre un salon en ligne (si le serveur du jeu est là).
const $ = (s) => document.querySelector(s);

export function lireJeton(code) {
  try { return localStorage.getItem(`p404-salon-${code}`); } catch { return null; }
}
export function ecrireJeton(code, jeton) {
  try { localStorage.setItem(`p404-salon-${code}`, jeton); } catch { /* ignoré */ }
}
export function lirePseudo() {
  try { return localStorage.getItem('p404-pseudo') ?? ''; } catch { return ''; }
}
export function ecrirePseudo(p) {
  try { localStorage.setItem('p404-pseudo', p); } catch { /* ignoré */ }
}

export async function serveurDisponible() {
  try {
    const r = await fetch('api/sante', { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    return r.ok && (await r.json()).ok === true;
  } catch { return false; }
}

export async function appel(url, corps) {
  const r = await fetch(url, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps ?? {}),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erreur ?? `Erreur ${r.status}`);
  return j;
}

export async function initEnLigne() {
  if (!(await serveurDisponible())) return;
  $('#en-ligne-ko').hidden = true;
  $('#en-ligne-ok').hidden = false;
  $('#pseudo').value = lirePseudo();
  const erreur = (m) => { $('#en-ligne-erreur').textContent = m; $('#en-ligne-erreur').hidden = !m; };
  const aller = (code, jeton) => { ecrireJeton(code, jeton); location.href = `salon.html?code=${code}`; };

  $('#btn-creer').addEventListener('click', async () => {
    erreur('');
    const pseudo = $('#pseudo').value.trim();
    if (!pseudo) return erreur('Indiquez votre nom pour que vos collègues vous reconnaissent.');
    ecrirePseudo(pseudo);
    try { const r = await appel('api/salons', { pseudo }); aller(r.code, r.jeton); }
    catch (e) { erreur(e.message); }
  });
  const rejoindre = async () => {
    erreur('');
    const pseudo = $('#pseudo').value.trim();
    const code = $('#code-salon').value.trim().toUpperCase();
    if (!pseudo) return erreur('Indiquez votre nom pour que vos collègues vous reconnaissent.');
    if (!/^[A-Z]{4}$/.test(code)) return erreur('Le code du salon fait 4 lettres.');
    ecrirePseudo(pseudo);
    try { const r = await appel(`api/salons/${code}/rejoindre`, { pseudo }); aller(r.code, r.jeton); }
    catch (e) { erreur(e.message); }
  };
  $('#btn-rejoindre').addEventListener('click', rejoindre);
  $('#code-salon').addEventListener('keydown', (e) => { if (e.key === 'Enter') rejoindre(); });
}
