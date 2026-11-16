// Générateur pseudo-aléatoire à graine (mulberry32) :
// une même graine produit la même journée pour tous les joueurs d'une partie coop.
export function creerHasard(graine) {
  let a = (typeof graine === 'string' ? hacher(graine) : graine) >>> 0;
  const suivant = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    reel: suivant,
    entier: (min, max) => min + Math.floor(suivant() * (max - min + 1)),
    choisir: (liste) => liste[Math.floor(suivant() * liste.length)],
    chance: (p) => suivant() < p,
    melanger: (liste) => {
      const l = [...liste];
      for (let i = l.length - 1; i > 0; i--) {
        const j = Math.floor(suivant() * (i + 1));
        [l[i], l[j]] = [l[j], l[i]];
      }
      return l;
    },
    pondere: (poids) => {
      const total = Object.values(poids).reduce((s, x) => s + x, 0);
      let x = suivant() * total;
      for (const [k, w] of Object.entries(poids)) { if ((x -= w) < 0) return k; }
      return Object.keys(poids).at(-1);
    },
  };
}

function hacher(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
