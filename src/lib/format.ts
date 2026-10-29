export const CATS = ['Tout', 'Musique', 'Gaming', 'Cuisine', 'Science', 'Sport', 'Tech', 'Humour', 'Voyage'];

export function fmtTime(s: number) {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

const dec = (n: number) => (n < 10 ? n.toFixed(1).replace(/\.0$/, '').replace('.', ',') : String(Math.floor(n)));

export function fmtCount(n: number) {
  if (n >= 1e6) return dec(n / 1e6) + ' M';
  if (n >= 1e3) return dec(n / 1e3) + ' k';
  return String(n);
}

export function ago(ts: number) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'à l’instant';
  const steps: [number, string, string][] = [
    [60, 'minute', 'minutes'],
    [3600, 'heure', 'heures'],
    [86400, 'jour', 'jours'],
    [604800, 'semaine', 'semaines'],
    [2592000, 'mois', 'mois'],
    [31536000, 'an', 'ans'],
  ];
  let out = '';
  for (let i = 0; i < steps.length; i++) {
    const [u, one, many] = steps[i];
    const next = steps[i + 1]?.[0];
    if (!next || s < next) {
      const n = Math.floor(s / u);
      out = `il y a ${n} ${n > 1 ? many : one}`;
      break;
    }
  }
  return out;
}

export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0] || '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

export const avatarBg = (h: number) => `oklch(0.8 0.11 ${h})`;

export const thumbGradient = (h: number, dark: boolean) =>
  dark
    ? `radial-gradient(130% 110% at 85% 0%, oklch(0.47 0.1 ${h}), oklch(0.21 0.035 ${h}) 72%)`
    : `radial-gradient(130% 110% at 85% 0%, oklch(0.93 0.05 ${h}), oklch(0.8 0.07 ${h}) 72%)`;

export const thumbInk = (h: number, dark: boolean) => (dark ? `oklch(0.84 0.06 ${h})` : `oklch(0.34 0.07 ${h})`);

export const plural = (n: number, one: string, many: string) => `${fmtCount(n)} ${n > 1 ? many : one}`;
