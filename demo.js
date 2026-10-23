// Sample data for the demo at ?demo — 26 weeks of a lean bulk with monthly progress photos.
// Lives in its own database, so it never touches real data.

const DAY = 864e5;

function random(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// [start, end, noise]
const PLAN = {
  weight: [76.0, 81.6, 0.35],
  bodyFat: [15.2, 13.9, 0.2],
  neck: [37.0, 38.4, 0.1],
  shoulders: [112, 117.5, 0.3],
  chest: [96, 102.5, 0.3],
  bicepsL: [33.8, 37.1, 0.15],
  bicepsR: [34.2, 37.5, 0.15],
  forearmL: [28.8, 30.4, 0.1],
  forearmR: [29.1, 30.7, 0.1],
  waist: [81.5, 79.6, 0.3],
  hips: [95, 97.5, 0.3],
  thighL: [55.2, 58.7, 0.25],
  thighR: [54.9, 58.4, 0.25],
  calfL: [36.0, 37.1, 0.1],
  calfR: [36.1, 37.3, 0.1],
};

/** A neutral studio-style silhouette that gets broader in the shoulders over time. */
async function silhouette(t, side) {
  const c = document.createElement('canvas');
  c.width = 900;
  c.height = 1200;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, 1200);
  bg.addColorStop(0, '#d9d4cc');
  bg.addColorStop(1, '#a9a196');
  g.fillStyle = bg;
  g.fillRect(0, 0, 900, 1200);
  g.fillStyle = 'rgba(255,255,255,0.08)';
  g.fillRect(0, 980, 900, 220);

  const cx = 450;
  const sh = (side ? 120 : 175) + t * (side ? 18 : 40);
  const waist = (side ? 105 : 120) - t * 6;
  const arm = 34 + t * 10;
  const body = g.createLinearGradient(cx - sh, 0, cx + sh, 0);
  body.addColorStop(0, '#3b342e');
  body.addColorStop(0.5, '#5a4f46');
  body.addColorStop(1, '#3b342e');
  g.fillStyle = body;
  g.beginPath();
  g.ellipse(cx + (side ? 10 : 0), 215, 62, 78, 0, 0, Math.PI * 2);
  g.fill();
  g.fillRect(cx - 32, 280, 64, 50);
  g.beginPath();
  g.moveTo(cx - sh, 350);
  g.quadraticCurveTo(cx, 300, cx + sh, 350);
  g.quadraticCurveTo(cx + sh + 8, 470, cx + waist + 10, 640);
  g.lineTo(cx + waist + 18, 760);
  g.quadraticCurveTo(cx + waist + 30, 900, cx + 70, 1200);
  g.lineTo(cx - 70, 1200);
  g.quadraticCurveTo(cx - waist - 30, 900, cx - waist - 18, 760);
  g.lineTo(cx - waist - 10, 640);
  g.quadraticCurveTo(cx - sh - 8, 470, cx - sh, 350);
  g.fill();
  if (!side) {
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(cx + s * (sh - 10), 345);
      g.quadraticCurveTo(cx + s * (sh + arm + 30), 420, cx + s * (sh + arm), 620);
      g.quadraticCurveTo(cx + s * (sh + arm - 10), 760, cx + s * (sh + 15), 820);
      g.lineTo(cx + s * (sh - 15), 815);
      g.quadraticCurveTo(cx + s * (sh + 10), 700, cx + s * (sh - 5), 480);
      g.fill();
    }
  }
  g.fillStyle = '#2b2622';
  g.fillRect(cx - waist - 20, 760, (waist + 20) * 2, 140);

  const encode = (max, q) =>
    new Promise((resolve) => {
      const k = document.createElement('canvas');
      const scale = Math.min(1, max / 1200);
      k.width = 900 * scale;
      k.height = 1200 * scale;
      k.getContext('2d').drawImage(c, 0, 0, k.width, k.height);
      k.toBlob((b) => b.arrayBuffer().then(resolve), 'image/jpeg', q);
    });
  return { full: await encode(1200, 0.85), thumb: await encode(400, 0.8) };
}

export async function seedDemo(write) {
  const rnd = random(7);
  const noise = (a) => (rnd() - 0.5) * 2 * a;
  const r1 = (v) => Math.round(v * 10) / 10;
  const N = 27;
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const entries = [];
  for (let i = 0; i < N; i++) {
    const d = new Date(today.getTime() - (N - 1 - i) * 7 * DAY);
    const ease = 1 - (1 - i / (N - 1)) ** 1.4;
    const values = {};
    for (const [key, [a, b, n]] of Object.entries(PLAN)) {
      // Weight every week, tape measurements every other week.
      if (key === 'weight' || i % 2 === 0) values[key] = r1(a + (b - a) * ease + noise(n));
    }
    entries.push({ id: 'demo-e' + i, date: isoDate(d), values, note: '', createdAt: d.getTime() });
  }
  entries[8].note = 'Deload week';
  entries[16].note = 'New bench PR — 100 kg';
  entries[N - 1].note = 'Morning, fasted';

  const photos = [];
  const fulls = [];
  for (const i of [0, 4, 8, 12, 16, 20, N - 1]) {
    for (const side of [false, true]) {
      const { full, thumb } = await silhouette(i / (N - 1), side);
      const id = `demo-p${i}${side ? 's' : 'f'}`;
      photos.push({ id, entryId: entries[i].id, createdAt: entries[i].createdAt + (side ? 1 : 0), thumb });
      fulls.push({ id, data: full });
    }
  }

  await write((s) => {
    entries.forEach((e) => s.entries.put(e));
    photos.forEach((p) => s.photos.put(p));
    fulls.forEach((f) => s.fulls.put(f));
  });
}
