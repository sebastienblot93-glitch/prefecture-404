// Sons synthétisés (aucun fichier audio) : tampon, papier, erreur.
let ctx = null;
let muet = false;
try { muet = localStorage.getItem('p404-muet') === '1'; } catch { /* stockage indisponible */ }

function audio() {
  if (muet) return null;
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

function bruit(a, duree) {
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * duree), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  const s = a.createBufferSource();
  s.buffer = buf;
  return s;
}

export function sonTampon() {
  const a = audio(); if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.18);
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + 0.3);
  const n = bruit(a, 0.09), f = a.createBiquadFilter(), gn = a.createGain();
  f.type = 'lowpass'; f.frequency.value = 900; gn.gain.value = 0.7;
  n.connect(f).connect(gn).connect(a.destination);
  n.start(t);
}

export function sonPapier() {
  const a = audio(); if (!a) return;
  const n = bruit(a, 0.22), f = a.createBiquadFilter(), g = a.createGain();
  f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.7; g.gain.value = 0.25;
  n.connect(f).connect(g).connect(a.destination);
  n.start();
}

export function sonErreur() {
  const a = audio(); if (!a) return;
  const t = a.currentTime;
  [0, 0.16].forEach((dt, i) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'square'; o.frequency.value = i ? 147 : 196;
    g.gain.setValueAtTime(0.08, t + dt);
    g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.14);
    o.connect(g).connect(a.destination);
    o.start(t + dt); o.stop(t + dt + 0.15);
  });
}

export const estMuet = () => muet;
export function basculerMuet() {
  muet = !muet;
  try { localStorage.setItem('p404-muet', muet ? '1' : '0'); } catch { /* ignoré */ }
  return muet;
}

export function sonTelephone() {
  const a = audio(); if (!a) return;
  const t = a.currentTime;
  [0, 0.45].forEach((dt) => {
    const o1 = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain();
    o1.frequency.value = 440; o2.frequency.value = 480;
    g.gain.setValueAtTime(0.0001, t + dt);
    g.gain.exponentialRampToValueAtTime(0.12, t + dt + 0.02);
    g.gain.setValueAtTime(0.12, t + dt + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.35);
    o1.connect(g); o2.connect(g); g.connect(a.destination);
    o1.start(t + dt); o2.start(t + dt); o1.stop(t + dt + 0.36); o2.stop(t + dt + 0.36);
  });
}
