// ---------- Constants ----------

const METRICS = [
  { key: 'weight', title: 'Weight', unit: 'kg' },
  { key: 'bodyFat', title: 'Body fat', unit: '%' },
  { key: 'neck', title: 'Neck', unit: 'cm' },
  { key: 'shoulders', title: 'Shoulders', unit: 'cm' },
  { key: 'chest', title: 'Chest', unit: 'cm' },
  { key: 'biceps', title: 'Biceps', unit: 'cm', paired: true },
  { key: 'forearm', title: 'Forearm', unit: 'cm', paired: true },
  { key: 'waist', title: 'Waist', unit: 'cm' },
  { key: 'hips', title: 'Hips', unit: 'cm' },
  { key: 'thigh', title: 'Thigh', unit: 'cm', paired: true },
  { key: 'calf', title: 'Calf', unit: 'cm', paired: true },
];
const METRIC = Object.fromEntries(METRICS.map((m) => [m.key, m]));

/** Stored value keys of a metric: paired ones keep Left and Right separately (bicepsL, bicepsR). */
const seriesKeys = (m) =>
  m.paired
    ? [{ key: m.key + 'L', label: 'L', name: 'Left' }, { key: m.key + 'R', label: 'R', name: 'Right', dashed: true }]
    : [{ key: m.key, label: '', name: '' }];
const hasMetric = (m, e) => seriesKeys(m).some((s) => e.values[s.key] != null);

const RANGES = [
  { key: '1m', label: '1M', months: 1 },
  { key: '3m', label: '3M', months: 3 },
  { key: '6m', label: '6M', months: 6 },
  { key: '1y', label: '1Y', months: 12 },
  { key: 'all', label: 'All', months: null },
];

const TABS = [
  { key: 'progress', title: 'Progress', icon: 'chart' },
  { key: 'history', title: 'Log', icon: 'list' },
  { key: 'photos', title: 'Photos', icon: 'photo' },
];

const ICONS = {
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5.5-5.5 4 4L21 7"/><path d="M3 21h18"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-9 9"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  back: '<svg viewBox="0 0 13 21" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2L2.5 10.5 11 19"/></svg>',
  close: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>',
  flip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7"/><path d="M20 4v4.7h-4.7"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.3"/><path d="M4 20v-4.7h4.7"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 7.5L12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  ruler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 7v4M10 7v3M14 7v4M18 7v3"/></svg>',
};

// ---------- Helpers ----------

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const pad2 = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const today = () => isoDate(new Date());
const toTime = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const nfSigned = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, signDisplay: 'exceptZero' });
const fmt = (v) => nf.format(v);
const fmtSigned = (v) => nfSigned.format(v);
const stripYear = (s) => s.replace(/\s+г\.$/, '');
const fmtDate = (iso) =>
  stripYear(new Date(toTime(iso)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
const fmtDateShort = (iso) =>
  stripYear(new Date(toTime(iso)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

function parseNum(text) {
  const s = String(text ?? '').trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

let toastTimer;
function toast(message) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2600);
}

// ---------- Storage (IndexedDB) ----------
// entries: { id, date: 'YYYY-MM-DD', values: { [metric]: number }, note, createdAt }
// photos:  { id, entryId, createdAt, thumb: ArrayBuffer }   — small, loaded at start
// fulls:   { id, data: ArrayBuffer }                         — loaded on demand

let db;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('body-tracker', 1);
    request.onupgradeneeded = () => {
      const d = request.result;
      d.createObjectStore('entries', { keyPath: 'id' });
      d.createObjectStore('photos', { keyPath: 'id' }).createIndex('entryId', 'entryId');
      d.createObjectStore('fulls', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const promisify = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const getAll = (store) => promisify(db.transaction(store).objectStore(store).getAll());
const getOne = (store, id) => promisify(db.transaction(store).objectStore(store).get(id));

/** Runs synchronous writes in one transaction across all stores. */
function write(fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(['entries', 'photos', 'fulls'], 'readwrite');
    fn({ entries: t.objectStore('entries'), photos: t.objectStore('photos'), fulls: t.objectStore('fulls') });
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Transaction aborted'));
  });
}

// ---------- State ----------

const state = {
  entries: [],
  photos: [],
  tab: 'progress',
  metric: null, // open metric detail on the progress tab
  range: 'all',
};

const entriesAsc = () =>
  [...state.entries].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
const entriesDesc = () => entriesAsc().reverse();
const photosOf = (entryId) =>
  state.photos.filter((p) => p.entryId === entryId).sort((a, b) => a.createdAt - b.createdAt);

function points(key) {
  return entriesAsc()
    .filter((e) => e.values[key] != null)
    .map((e) => ({ date: e.date, t: toTime(e.date), v: e.values[key], entry: e }));
}

function metricSeries(m, rangeKey = 'all') {
  return seriesKeys(m).map((s) => ({ ...s, pts: inRange(points(s.key), rangeKey) }));
}

/** "81.9 kg" or "37.4 / 37.1 cm" for one entry. */
function metricText(m, e, withUnit = true) {
  const text = seriesKeys(m).map((s) => (e.values[s.key] != null ? fmt(e.values[s.key]) : '—')).join(' / ');
  return withUnit ? `${text} ${m.unit}` : text;
}

function inRange(pts, rangeKey) {
  const range = RANGES.find((r) => r.key === rangeKey);
  if (!range?.months) return pts;
  const d = new Date();
  d.setMonth(d.getMonth() - range.months);
  const cutoff = isoDate(d);
  return pts.filter((p) => p.date >= cutoff);
}

// Object URLs for image data, cached per photo.
const urls = new Map();
function thumbUrl(photo) {
  const k = photo.id + ':thumb';
  if (!urls.has(k)) urls.set(k, URL.createObjectURL(new Blob([photo.thumb], { type: 'image/jpeg' })));
  return urls.get(k);
}
async function fullUrl(id) {
  const k = id + ':full';
  if (!urls.has(k)) {
    const rec = await getOne('fulls', id);
    if (!rec) return null;
    urls.set(k, URL.createObjectURL(new Blob([rec.data], { type: 'image/jpeg' })));
  }
  return urls.get(k);
}
function dropUrls(id) {
  for (const k of [id + ':thumb', id + ':full']) {
    if (urls.has(k)) {
      URL.revokeObjectURL(urls.get(k));
      urls.delete(k);
    }
  }
}

// ---------- Image processing ----------

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode failed'));
    };
    img.src = url;
  });
}

function resize(img, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', quality)
  );
}

/** Downscales a picked photo so storage stays small. Browsers apply EXIF orientation on draw. */
async function processImage(file) {
  const { img, url } = await loadImage(file);
  try {
    const full = await resize(img, 2000, 0.85);
    const thumb = await resize(img, 400, 0.8);
    return { full: await full.arrayBuffer(), thumb: await thumb.arrayBuffer() };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------- Charts ----------

function domain(values) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const padding = Math.max((hi - lo) * 0.15, Math.abs(hi) * 0.01, 0.5);
  return [lo - padding, hi + padding];
}

function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}

/** Smooth line through points (Catmull-Rom converted to cubic Béziers). */
function smoothPath(pts) {
  const r = (n) => n.toFixed(1);
  let d = `M${r(pts[0][0])},${r(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${r(c1[0])},${r(c1[1])} ${r(c2[0])},${r(c2[1])} ${r(p2[0])},${r(p2[1])}`;
  }
  return d;
}

// A chart takes a list of series: [{ label, name, dashed, pts }]. Paired metrics have Left (solid) and Right (dashed).

function scales(all, w, h, pad) {
  const [lo, hi] = domain(all.map((p) => p.v));
  const ts = all.map((p) => p.t);
  const t0 = Math.min(...ts);
  const t1 = Math.max(...ts);
  const x = (t) => (t1 === t0 ? pad.l + (w - pad.l - pad.r) / 2 : pad.l + ((t - t0) / (t1 - t0)) * (w - pad.l - pad.r));
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (h - pad.t - pad.b);
  return { x, y, lo, hi, t0, t1 };
}

const cameraMark = (cx, top) =>
  `<g><rect x="${cx - 5.5}" y="${top}" width="11" height="8" rx="2" fill="var(--sec)"/><circle cx="${cx}" cy="${top + 4.2}" r="2" fill="var(--card)"/></g>`;

function sparkline(series) {
  const w = 90;
  const h = 36;
  const { x, y } = scales(series.flatMap((s) => s.pts), w, h, { l: 2, r: 2, t: 3, b: 3 });
  const paths = series
    .filter((s) => s.pts.length > 1)
    .map((s) => `<path d="${smoothPath(s.pts.map((p) => [x(p.t), y(p.v)]))}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${s.dashed ? ' stroke-dasharray="3 4"' : ''}/>`)
    .join('');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}">${paths}</svg>`;
}

/** photoDays: Map of day timestamp → photo; those days get a camera mark under the plot. */
function mountChart(el, series, onSelect, photoDays = new Map()) {
  const all = series.flatMap((s) => s.pts);
  if (!all.length) {
    el.innerHTML = '<div class="chart-empty">No data for this period</div>';
    return;
  }
  const w = el.clientWidth;
  const h = el.clientHeight;
  const pad = { l: 6, r: 40, t: 10, b: photoDays.size ? 36 : 24 };
  const { x, y, lo, hi, t0, t1 } = scales(all, w, h, pad);
  const photoTimes = [...photoDays.keys()].filter((t) => t >= t0 && t <= t1);
  const dataTimes = [...new Set(all.map((p) => p.t))].sort((a, b) => a - b);
  // Photo days are selectable too, even when this metric wasn't measured that day.
  const times = [...new Set([...dataTimes, ...photoTimes])].sort((a, b) => a - b);
  const camY = h - pad.b + 7;
  const cams = photoTimes.map((t) => cameraMark(x(t), camY)).join('');

  const step = niceStep((hi - lo) / 3);
  const ticks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
  const grid = ticks
    .map((v) => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--sep)" stroke-width="0.5"/>
      <text x="${w - pad.r + 6}" y="${y(v) + 4}">${fmt(v)}</text>`)
    .join('');

  const dateOf = (t) => isoDate(new Date(t));
  const xLabels = `<text x="${pad.l}" y="${h - 4}">${fmtDateShort(dateOf(dataTimes[0]))}</text>` +
    (dataTimes.length > 1 ? `<text x="${w - pad.r}" y="${h - 4}" text-anchor="end">${fmtDateShort(dateOf(dataTimes[dataTimes.length - 1]))}</text>` : '');

  const marks = series.map((s) => {
    const xy = s.pts.map((p) => [x(p.t), y(p.v)]);
    if (s.trend) {
      return xy.length > 1
        ? `<path d="${smoothPath(xy)}" fill="none" stroke="var(--text)" stroke-opacity="0.16" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
        : '';
    }
    const line = xy.length > 1
      ? `<path d="${smoothPath(xy)}" fill="none" stroke="var(--text)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"${s.dashed ? ' stroke-dasharray="5 5"' : ''}/>`
      : '';
    const dots = xy.length <= 30
      ? xy.map(([cx, cy]) => s.dashed
        ? `<circle cx="${cx}" cy="${cy}" r="2.6" fill="var(--card)" stroke="var(--text)" stroke-width="1.6"/>`
        : `<circle cx="${cx}" cy="${cy}" r="3" fill="var(--text)"/>`).join('')
      : '';
    return line + dots;
  }).join('');

  el.innerHTML = `<svg>${grid}${xLabels}${cams}${marks}<g class="sel"></g></svg>`;
  const svg = el.querySelector('svg');
  const sel = el.querySelector('.sel');

  const pick = (clientX) => {
    const px = clientX - svg.getBoundingClientRect().left;
    const t = times.reduce((best, cur) => (Math.abs(x(cur) - px) < Math.abs(x(best) - px) ? cur : best));
    const dots = series
      .filter((s) => !s.trend)
      .map((s) => s.pts.find((p) => p.t === t))
      .filter(Boolean)
      .map((p) => `<circle cx="${x(t)}" cy="${y(p.v)}" r="6" fill="var(--text)" stroke="var(--card)" stroke-width="2"/>`)
      .join('');
    sel.innerHTML = `<line x1="${x(t)}" x2="${x(t)}" y1="${pad.t}" y2="${h - pad.b}" stroke="var(--ter)" stroke-width="1"/>${dots}`;
    onSelect(t);
  };
  const clear = () => {
    sel.innerHTML = '';
    onSelect(null);
  };

  svg.addEventListener('pointerdown', (e) => pick(e.clientX));
  svg.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || e.buttons) pick(e.clientX);
  });
  svg.addEventListener('pointerup', clear);
  svg.addEventListener('pointercancel', clear);
  svg.addEventListener('pointerleave', clear);
}

// ---------- Views ----------

const plusButton = '<button class="tb-btn" data-action="new-entry" aria-label="New entry">' + ICONS.plus + '</button>';

function emptyState(title, text) {
  return `<div class="empty">${ICONS.ruler}<h2>${title}</h2><p>${text}</p>
    <button class="pill" data-action="new-entry">Add entry</button></div>`;
}

const sideTag = (s) => (s.label ? `<span class="side">${s.label}</span>` : '');

/** "L +1.2 · R +0.9 cm" for the series that have at least two points. */
const DAY = 864e5;

/** Least-squares slope over the 4 weeks before the latest point, in units per week. */
function weeklyRate(pts) {
  if (pts.length < 2) return null;
  const end = pts[pts.length - 1].t;
  const win = pts.filter((p) => p.t >= end - 28 * DAY);
  if (win.length < 2 || end - win[0].t < 7 * DAY) return null;
  const mt = win.reduce((a, p) => a + p.t, 0) / win.length;
  const mv = win.reduce((a, p) => a + p.v, 0) / win.length;
  const num = win.reduce((a, p) => a + (p.t - mt) * (p.v - mv), 0);
  const den = win.reduce((a, p) => a + (p.t - mt) ** 2, 0);
  return den ? (num / den) * 7 * DAY : null;
}

/** Time-aware exponential moving average (τ = 7 days): smooths out day-to-day water weight. */
function trendPoints(pts, tau = 7 * DAY) {
  let level = null;
  return pts.map((p, i) => {
    level = i === 0 ? p.v : level + (1 - Math.exp(-(p.t - pts[i - 1].t) / tau)) * (p.v - level);
    return { ...p, v: level };
  });
}

/** "+0.3 kg/week (+0.4%)" over the last 4 weeks; "L +0.1 · R +0.2 cm/week" for paired metrics. */
function rateText(m, allSeries) {
  const rates = allSeries.map((s) => ({ s, r: weeklyRate(s.pts) })).filter((x) => x.r != null);
  if (!rates.length) return '';
  if (m.key === 'weight') {
    const { s, r } = rates[0];
    return `${fmtSigned(r)} kg/week (${fmtSigned((r / s.pts[s.pts.length - 1].v) * 100)}%)`;
  }
  return `${rates.map(({ s, r }) => `${s.label ? s.label + ' ' : ''}${fmtSigned(r)}`).join(' · ')} ${m.unit}/week`;
}

function changeText(m, series, suffix) {
  const parts = series
    .filter((s) => s.pts.length > 1)
    .map((s) => `${s.label ? s.label + ' ' : ''}${fmtSigned(s.pts[s.pts.length - 1].v - s.pts[0].v)}`);
  return parts.length ? `${parts.join(' · ')} ${m.unit} ${suffix}` : '';
}

function viewProgress() {
  const metrics = METRICS.filter((m) => state.entries.some((e) => hasMetric(m, e)));
  if (!metrics.length) {
    return { title: 'Progress', large: true, actions: plusButton, body: emptyState('No entries yet', 'Add your first measurements to start tracking') };
  }
  const rows = metrics.map((m) => {
    const series = metricSeries(m).filter((s) => s.pts.length);
    const value = series
      .map((s) => `<span class="pair-val">${sideTag(s)}${fmt(s.pts[s.pts.length - 1].v)}</span>`)
      .join('');
    const rate = m.key === 'weight' ? rateText(m, series) : '';
    const delta = [changeText(m, series, 'since start'), rate].filter(Boolean).join(' · ');
    return `<button class="row metric-row" data-action="open-metric" data-key="${m.key}">
      <div class="grow">
        <div class="mr-title">${m.title}</div>
        <div class="mr-value ${m.paired ? 'paired' : ''}">${value}<span class="unit">${m.unit}</span></div>
        ${delta ? `<div class="mr-delta">${delta}</div>` : ''}
      </div>
      ${series.some((s) => s.pts.length > 1) ? sparkline(series) : ''}
      <span class="chev"></span>
    </button>`;
  });
  return { title: 'Progress', large: true, actions: plusButton, body: `<div class="group">${rows.join('')}</div>` };
}

function viewMetric(key) {
  const m = METRIC[key];
  const series = metricSeries(m, state.range);
  const rate = rateText(m, metricSeries(m));
  // Weight gets a smoothed trend line, computed over all data so the range start isn't skewed.
  const trend = m.key === 'weight'
    ? [{ name: 'Trend', trend: true, pts: inRange(trendPoints(points('weight')), state.range) }]
    : [];
  const all = series.flatMap((s) => s.pts);
  const latestT = all.length ? Math.max(...all.map((p) => p.t)) : null;
  const firstT = all.length ? Math.min(...all.map((p) => p.t)) : null;
  const periodChange = changeText(m, series, 'this period');

  const photoDays = new Map();
  for (const e of entriesAsc()) {
    const photo = photosOf(e.id)[0];
    if (photo) photoDays.set(toTime(e.date), photo);
  }
  const photosInView = latestT != null && [...photoDays.keys()].some((t) => t >= firstT && t <= latestT);

  const blocks = series
    .map((s, i) => `
      <div class="d-block">
        ${s.name ? `<div class="d-label">${s.name}</div>` : ''}
        <div class="d-value"><span id="d-v${i}">—</span><span class="unit">${m.unit}</span></div>
      </div>`)
    .join('');
  const legendItems = [
    ...(m.paired ? series.map((s) => `<span><i class="lg ${s.dashed ? 'dashed' : ''}"></i>${s.name}</span>`) : []),
    ...(trend.length ? ['<span><i class="lg trend"></i>Trend</span>'] : []),
    ...(photosInView ? [`<span><svg class="lg-cam" viewBox="0 0 12 9">${cameraMark(6, 0.5)}</svg>Photo day</span>`] : []),
  ];
  const legend = legendItems.length ? `<div class="legend">${legendItems.join('')}</div>` : '';

  const entries = entriesDesc().filter((e) => hasMetric(m, e));
  const body = `
    <div class="group detail">
      <div class="d-top">
        <div class="d-blocks">${blocks}</div>
        <button class="d-photo" id="d-photo" data-action="open-photo" aria-label="Open photo" hidden><img alt=""></button>
      </div>
      <div class="d-sub" id="d-date"></div>
      <div class="d-sub" id="d-change"></div>
      ${rate ? `<div class="d-rate"><span>Last 4 weeks</span><b class="num">${rate}</b></div>` : ''}
      <div class="chart" id="chart"></div>
      ${legend}
      <div class="segmented">
        ${RANGES.map((r) => `<button data-action="range" data-range="${r.key}" class="${r.key === state.range ? 'on' : ''}">${r.label}</button>`).join('')}
      </div>
    </div>
    <div class="group-title">History</div>
    <div class="group">
      ${entries.map((e) => {
        const photo = photosOf(e.id)[0];
        return `
        <button class="row" data-action="edit-entry" data-id="${e.id}">
          <span class="grow">${fmtDate(e.date)}</span>
          <span class="sec num">${metricText(m, e)}</span>
          ${photo ? `<img class="h-thumb" src="${thumbUrl(photo)}" alt="Open photo" data-action="open-photo" data-id="${photo.id}">` : '<span class="h-thumb none"></span>'}
        </button>`;
      }).join('')}
    </div>`;

  // Shows the selected date, or the latest values when nothing is selected.
  const show = (t) => {
    const values = series.map((s) => {
      if (t != null) return s.pts.find((p) => p.t === t)?.v ?? null;
      return s.pts.length ? s.pts[s.pts.length - 1].v : null;
    });
    values.forEach((v, i) => {
      $(`#d-v${i}`).textContent = v != null ? fmt(v) : '—';
    });
    const when = t ?? latestT;
    $('#d-date').textContent = when != null ? fmtDate(isoDate(new Date(when))) : '';
    const gap = m.paired && values.every((v) => v != null) ? `Difference ${fmt(Math.abs(values[0] - values[1]))} ${m.unit}` : '';
    $('#d-change').textContent = [t == null ? periodChange : '', gap].filter(Boolean).join(' · ');
    const photo = when != null ? photoDays.get(when) : null;
    const button = $('#d-photo');
    button.hidden = !photo;
    if (photo) {
      button.dataset.id = photo.id;
      button.querySelector('img').src = thumbUrl(photo);
    }
  };

  const after = () => {
    show(null);
    mountChart($('#chart'), [...trend, ...series], show, photoDays);
  };

  return { title: m.title, back: true, body, after };
}

function viewHistory() {
  const lastExport = Number(localStorage.getItem('lastExport')) || null;
  const months = photoMonths();
  const backup = `
    <div class="group-title">Backup</div>
    <div class="group">
      <button class="row action" data-action="export-measurements">Export measurements</button>
      <label class="row action">Import from file
        <input type="file" accept=".json,application/json" multiple hidden data-import>
      </label>
    </div>
    <div class="group-foot">Your data lives only on this phone. The measurements file is small and holds all your numbers.
      ${lastExport ? `Last export: ${fmtDate(isoDate(new Date(lastExport)))}.` : ''}</div>
    ${months.length ? `
      <div class="group-title">Photo backup</div>
      <div class="group">
        ${months.map((m) => `
          <button class="row" data-action="month-backup" data-month="${m.key}">
            <span class="grow">${fmtMonth(m.key)}</span>
            <span class="sec num">${m.saved ? '<span class="saved">Saved</span> · ' : ''}${plural(m.count, 'photo')}</span>
            <span class="chev"></span>
          </button>`).join('')}
      </div>
      <div class="group-foot">Save a month to Photos or Files as regular images, or as a backup file you can import later.</div>` : ''}`;

  const entries = entriesDesc();
  if (!entries.length) {
    return { title: 'Log', large: true, actions: plusButton, body: emptyState('No entries yet', 'All your measurements will show up here') + '<div style="height:32px"></div>' + backup };
  }
  const rows = entries.map((e) => {
    const summary = METRICS.filter((m) => hasMetric(m, e))
      .map((m) => `${m.title.toLowerCase()} ${metricText(m, e, false)}`)
      .join(' · ');
    const photo = photosOf(e.id)[0];
    return `<button class="row" data-action="edit-entry" data-id="${e.id}">
      <div class="grow">
        <div class="er-date">${fmtDate(e.date)}</div>
        ${summary ? `<div class="er-sum num">${summary}</div>` : ''}
        ${e.note ? `<div class="er-sum">${esc(e.note)}</div>` : ''}
      </div>
      ${photo ? `<img class="er-thumb" src="${thumbUrl(photo)}" alt="Open photo" data-action="open-photo" data-id="${photo.id}">` : ''}
    </button>`;
  });
  return { title: 'Log', large: true, actions: plusButton, body: `<div class="group">${rows.join('')}</div>${backup}` };
}

function photoEntriesDesc() {
  return entriesDesc().filter((e) => photosOf(e.id).length);
}

function viewPhotos() {
  const groups = photoEntriesDesc();
  if (!groups.length) {
    return { title: 'Photos', large: true, body: emptyState('No photos yet', 'Attach photos to entries to see your progress') };
  }
  const total = groups.reduce((n, e) => n + photosOf(e.id).length, 0);
  const body = groups.map((e) => `
    <div class="ph-date">${fmtDate(e.date)}</div>
    <div class="ph-grid">
      ${photosOf(e.id).map((p) => `<button class="ph-cell" data-action="open-photo" data-id="${p.id}"><img src="${thumbUrl(p)}" loading="lazy" alt=""></button>`).join('')}
    </div>`).join('');
  const actions = total > 1 ? '<button class="tb-btn" data-action="compare">Compare</button>' : '';
  return { title: 'Photos', large: true, actions, body };
}

function currentView() {
  if (state.tab === 'progress') return state.metric ? viewMetric(state.metric) : viewProgress();
  if (state.tab === 'history') return viewHistory();
  return viewPhotos();
}

function render() {
  const view = currentView();
  const back = view.back
    ? `<button class="tb-btn back" data-action="back">${ICONS.back}<span>Progress</span></button>`
    : '';
  $('#app').innerHTML = `
    <header class="topbar ${view.large ? 'flat' : ''}">
      <div class="tb-left">${back}</div>
      <div class="tb-title">${view.large ? '' : view.title}</div>
      <div class="tb-right">${view.actions || ''}</div>
    </header>
    <main>
      ${view.large ? `<h1 class="large">${view.title}</h1>` : ''}
      ${view.body}
    </main>
    <nav class="tabbar">
      ${TABS.map((t) => `<button class="tab ${t.key === state.tab ? 'on' : ''}" data-action="tab" data-tab="${t.key}">${ICONS[t.icon]}<span>${t.title}</span></button>`).join('')}
    </nav>`;
  view.after?.();
}

// ---------- Overlays ----------

function openOverlay(el) {
  $('#overlay').append(el);
  document.documentElement.classList.add('locked');
  el.getBoundingClientRect(); // commit initial styles so the transition runs
  el.classList.add('shown');
}

function closeOverlay(el) {
  el.classList.remove('shown');
  setTimeout(() => {
    el.remove();
    if (!$('#overlay').children.length) document.documentElement.classList.remove('locked');
  }, 320);
}

// ---------- Entry editor ----------

function openEditor(entry) {
  const previous = entriesDesc().find((e) => e.id !== entry?.id);
  const photos = entry
    ? photosOf(entry.id).map((p) => ({ id: p.id, existing: true, url: thumbUrl(p) }))
    : [];
  const removed = [];
  let pending = 0;

  const el = document.createElement('div');
  el.className = 'sheet';
  el.innerHTML = `
    <div class="sheet-bar">
      <button class="tb-btn" data-e="cancel">Cancel</button>
      <div class="tb-title">${entry ? 'Entry' : 'New entry'}</div>
      <button class="tb-btn" data-e="save">Save</button>
    </div>
    <div class="sheet-body">
      <div class="group">
        <label class="row field"><span class="grow">Date</span><input type="date" value="${entry?.date ?? today()}" data-date></label>
      </div>
      <div class="group-title">Measurements</div>
      <div class="group">
        ${METRICS.map((m) => {
          const input = (k, cls = '') => `<input inputmode="decimal" autocomplete="off" data-m="${k}" class="${cls}"
              value="${entry?.values[k] != null ? String(entry.values[k]) : ''}"
              placeholder="${previous?.values[k] != null ? fmt(previous.values[k]) : '—'}">`;
          if (!m.paired) {
            return `<label class="row field"><span class="grow">${m.title}</span>${input(m.key)}<span class="unit">${m.unit}</span></label>`;
          }
          const [l, r] = seriesKeys(m);
          return `<div class="row field paired">
            <span class="grow">${m.title}</span>
            <label class="side-input"><span class="side">L</span>${input(l.key, 'short')}</label>
            <label class="side-input"><span class="side">R</span>${input(r.key, 'short')}</label>
            <span class="unit">${m.unit}</span>
          </div>`;
        }).join('')}
      </div>
      <div class="group-title">Photos</div>
      <div class="group">
        <div class="strip" hidden></div>
        ${navigator.mediaDevices?.getUserMedia ? '<button class="row action" data-e="camera">Take photo</button>' : ''}
        <label class="row action">Choose from library
          <input type="file" accept="image/*" multiple hidden data-photos>
        </label>
      </div>
      <div class="group-title">Note</div>
      <div class="group">
        <textarea class="note" rows="2" placeholder="Optional" data-note>${esc(entry?.note ?? '')}</textarea>
      </div>
      ${entry ? '<div class="group"><button class="row danger" data-e="delete">Delete entry</button></div>' : ''}
    </div>`;

  const strip = $('.strip', el);
  const saveBtn = $('[data-e="save"]', el);
  const inputs = [...el.querySelectorAll('[data-m]')];

  const hasData = () => photos.length > 0 || inputs.some((i) => parseNum(i.value) != null);
  const updateSave = () => {
    saveBtn.disabled = pending > 0 || !hasData();
  };

  const renderStrip = () => {
    strip.hidden = photos.length === 0 && pending === 0;
    strip.innerHTML =
      photos.map((p) => `
        <div class="strip-item">
          <img src="${p.url}" alt="Open photo" data-e="view-photo" data-id="${p.id}">
          <button class="strip-remove" data-e="remove-photo" data-id="${p.id}" aria-label="Remove">${ICONS.close}</button>
        </div>`).join('') +
      '<div class="strip-item loading"></div>'.repeat(pending);
    updateSave();
  };

  const close = () => {
    photos.filter((p) => !p.existing).forEach((p) => {
      URL.revokeObjectURL(p.url);
      if (p.fullUrl) URL.revokeObjectURL(p.fullUrl);
    });
    closeOverlay(el);
  };

  el.addEventListener('input', updateSave);

  const addImages = async (blobs) => {
    pending += blobs.length;
    renderStrip();
    for (const blob of blobs) {
      try {
        const { full, thumb } = await processImage(blob);
        photos.push({
          id: uid(),
          existing: false,
          full,
          thumb,
          url: URL.createObjectURL(new Blob([thumb], { type: 'image/jpeg' })),
        });
      } catch {
        toast('Couldn’t open photo');
      }
      pending -= 1;
      renderStrip();
    }
  };

  $('[data-photos]', el).addEventListener('change', (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    addImages(files);
  });

  el.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-e]');
    if (!target) return;
    const action = target.dataset.e;

    if (action === 'cancel') close();

    if (action === 'camera') {
      // Ghosts come from the most recent other session that has photos.
      const prev = entriesDesc().find((x) => x.id !== entry?.id && photosOf(x.id).length);
      const ghosts = prev ? photosOf(prev.id).map((p) => ({ load: () => fullUrl(p.id), date: `Ghost from ${fmtDate(prev.date)}` })) : [];
      openCamera({ ghosts, onShot: (blob) => addImages([blob]) });
    }

    if (action === 'view-photo') {
      const date = fmtDate($('[data-date]', el).value || today());
      const items = photos.map((p) => {
        const saved = p.existing ? state.photos.find((x) => x.id === p.id) : null;
        return {
          key: p.id,
          thumb: p.url,
          full: async () => (saved ? fullUrl(p.id) : (p.fullUrl ??= URL.createObjectURL(new Blob([p.full], { type: 'image/jpeg' })))),
          date,
          photo: saved,
        };
      });
      openViewer(items, photos.findIndex((p) => p.id === target.dataset.id));
    }

    if (action === 'remove-photo') {
      e.preventDefault();
      const i = photos.findIndex((p) => p.id === target.dataset.id);
      if (i < 0) return;
      const [p] = photos.splice(i, 1);
      if (p.existing) removed.push(p.id);
      else URL.revokeObjectURL(p.url);
      renderStrip();
    }

    if (action === 'save') {
      if (saveBtn.disabled) return;
      saveBtn.disabled = true;
      const values = {};
      for (const input of inputs) {
        const v = parseNum(input.value);
        if (v != null) values[input.dataset.m] = v;
      }
      const record = {
        id: entry?.id ?? uid(),
        date: $('[data-date]', el).value || today(),
        values,
        note: $('[data-note]', el).value.trim(),
        createdAt: entry?.createdAt ?? Date.now(),
      };
      const now = Date.now();
      const added = photos
        .filter((p) => !p.existing)
        .map((p, i) => ({ meta: { id: p.id, entryId: record.id, createdAt: now + i, thumb: p.thumb }, full: { id: p.id, data: p.full } }));
      try {
        await write((s) => {
          s.entries.put(record);
          removed.forEach((id) => {
            s.photos.delete(id);
            s.fulls.delete(id);
          });
          added.forEach((a) => {
            s.photos.put(a.meta);
            s.fulls.put(a.full);
          });
        });
      } catch (err) {
        console.error(err);
        toast('Couldn’t save');
        updateSave();
        return;
      }
      state.entries = state.entries.filter((x) => x.id !== record.id).concat(record);
      removed.forEach(dropUrls);
      state.photos = state.photos.filter((p) => !removed.includes(p.id)).concat(added.map((a) => a.meta));
      close();
      render();
    }

    if (action === 'delete') {
      if (!confirm('Delete this entry and its photos?')) return;
      const ids = photosOf(entry.id).map((p) => p.id);
      await write((s) => {
        s.entries.delete(entry.id);
        ids.forEach((id) => {
          s.photos.delete(id);
          s.fulls.delete(id);
        });
      });
      ids.forEach(dropUrls);
      state.entries = state.entries.filter((x) => x.id !== entry.id);
      state.photos = state.photos.filter((p) => !ids.includes(p.id));
      if (state.metric && !state.entries.some((x) => hasMetric(METRIC[state.metric], x))) state.metric = null;
      close();
      render();
    }
  });

  renderStrip();
  openOverlay(el);
}

// ---------- Photo viewer & compare ----------

// A viewer item: { key, thumb: url, full: () => Promise<url>, date: string, photo?: saved photo record }.
function photoDate(photo) {
  const entry = state.entries.find((e) => e.id === photo.entryId);
  return entry ? fmtDate(entry.date) : '';
}

const viewItem = (photo) => ({
  key: photo.id,
  thumb: thumbUrl(photo),
  full: () => fullUrl(photo.id),
  date: photoDate(photo),
  photo,
});

/**
 * Pinch to zoom, double-tap to toggle zoom, drag to pan while zoomed.
 * Uses touch events because iOS starts the native swipe before a second pointer arrives.
 */
function enableZoom(slide, img, scroller) {
  let s = 1;
  let tx = 0;
  let ty = 0;
  let gesture = null;
  let tap = null;
  let lastTap = null;

  const apply = (animate) => {
    img.style.transition = animate ? 'transform 0.25s ease' : 'none';
    img.style.transform = s === 1 ? '' : `translate(${tx}px, ${ty}px) scale(${s})`;
    scroller.classList.toggle('zoomed', s > 1);
  };
  const clamp = () => {
    const mx = Math.max(0, (img.offsetWidth * s - slide.clientWidth) / 2);
    const my = Math.max(0, (img.offsetHeight * s - slide.clientHeight) / 2);
    tx = Math.min(mx, Math.max(-mx, tx));
    ty = Math.min(my, Math.max(-my, ty));
  };
  // Touch position relative to the slide's centre (the transform origin).
  const rel = (t) => {
    const r = slide.getBoundingClientRect();
    return [t.clientX - r.left - r.width / 2, t.clientY - r.top - r.height / 2];
  };
  const pinchState = (touches) => {
    const a = rel(touches[0]);
    const b = rel(touches[1]);
    return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
  };
  const reset = (animate) => {
    s = 1;
    tx = 0;
    ty = 0;
    apply(animate);
  };

  slide.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      tap = null;
      gesture = { pinch: true, ...pinchState(e.touches), s, tx, ty };
    } else if (e.touches.length === 1) {
      const p = rel(e.touches[0]);
      tap = { p, moved: false };
      gesture = s > 1 ? { pinch: false, p, tx, ty } : null;
    }
  }, { passive: false });

  slide.addEventListener('touchmove', (e) => {
    if (tap && e.touches.length === 1) {
      const p = rel(e.touches[0]);
      if (Math.hypot(p[0] - tap.p[0], p[1] - tap.p[1]) > 10) tap.moved = true;
    }
    if (!gesture) return;
    if (gesture.pinch && e.touches.length === 2) {
      e.preventDefault();
      const { d, mid } = pinchState(e.touches);
      const next = Math.min(4, Math.max(1, (gesture.s * d) / gesture.d));
      const k = next / gesture.s;
      // Keep the point under the fingers fixed while scaling.
      tx = mid[0] - (gesture.mid[0] - gesture.tx) * k;
      ty = mid[1] - (gesture.mid[1] - gesture.ty) * k;
      s = next;
      clamp();
      apply(false);
    } else if (!gesture.pinch && s > 1 && e.touches.length === 1) {
      e.preventDefault();
      const p = rel(e.touches[0]);
      tx = gesture.tx + p[0] - gesture.p[0];
      ty = gesture.ty + p[1] - gesture.p[1];
      clamp();
      apply(false);
    }
  }, { passive: false });

  slide.addEventListener('touchend', (e) => {
    if (e.touches.length === 1 && gesture?.pinch) {
      // One finger lifted after a pinch: continue as a pan.
      gesture = s > 1 ? { pinch: false, p: rel(e.touches[0]), tx, ty } : null;
      return;
    }
    if (e.touches.length) return;
    if (gesture?.pinch && s < 1.05) reset(true);
    if (tap && !tap.moved) {
      const now = Date.now();
      if (lastTap && now - lastTap.time < 300 && Math.hypot(tap.p[0] - lastTap.p[0], tap.p[1] - lastTap.p[1]) < 40) {
        if (s > 1) {
          reset(true);
        } else {
          s = 2.5;
          tx = -tap.p[0] * (s - 1);
          ty = -tap.p[1] * (s - 1);
          clamp();
          apply(true);
        }
        lastTap = null;
      } else {
        lastTap = { time: now, p: tap.p };
      }
    }
    gesture = null;
    tap = null;
  });

  return { reset: () => s !== 1 && reset(false) };
}

/** Horizontal snap scroller; loads full-size images as slides come into view. */
function buildScroller(items, onIndex) {
  const scroller = document.createElement('div');
  scroller.className = 'scroller';
  scroller.innerHTML = items
    .map((item, i) => `<div class="slide"><img src="${item.thumb}" data-i="${i}" alt="" draggable="false"></div>`)
    .join('');

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const img = entry.target;
        observer.unobserve(img);
        items[img.dataset.i].full().then((url) => url && (img.src = url));
      }
    },
    { root: scroller, rootMargin: '0px 100%' }
  );
  const zooms = [...scroller.querySelectorAll('.slide')].map((slide) => {
    const img = slide.querySelector('img');
    observer.observe(img);
    return enableZoom(slide, img, scroller);
  });

  let current = -1;
  const report = (i) => {
    if (i === current) return;
    zooms[current]?.reset();
    current = i;
    onIndex(i);
  };
  const index = () => Math.round(scroller.scrollLeft / Math.max(1, scroller.clientWidth));
  scroller.addEventListener('scroll', () => report(index()), { passive: true });

  return {
    scroller,
    scrollTo: (i) => {
      scroller.scrollLeft = i * scroller.clientWidth;
      report(i);
    },
  };
}

function openViewer(items, start = 0) {
  const el = document.createElement('div');
  el.className = 'viewer';
  el.innerHTML = `
    <div class="viewer-top">
      <span data-caption></span>
      <div class="viewer-actions">
        <button class="close" data-share aria-label="Save or share photo" disabled>${ICONS.share}</button>
        <button class="close" data-close aria-label="Close">${ICONS.close}</button>
      </div>
    </div>
    <div class="panes"><div class="pane"></div></div>
    <div class="caption">Pinch or double-tap to zoom</div>`;
  const caption = $('[data-caption]', el);
  const shareBtn = $('[data-share]', el);
  shareBtn.hidden = !items.some((item) => item.photo);
  // The current photo's file is prepared ahead so the share sheet opens within the tap.
  let prepared = null;
  let currentKey = null;
  const { scroller, scrollTo } = buildScroller(items, (i) => {
    const item = items[i];
    if (!item) return;
    currentKey = item.key;
    prepared = null;
    shareBtn.disabled = true;
    caption.textContent = item.date;
    if (!item.photo) return;
    jpegFiles([item.photo]).then((files) => {
      if (currentKey !== item.key) return;
      prepared = files;
      shareBtn.disabled = false;
    });
  });
  $('.pane', el).append(scroller);
  $('[data-close]', el).addEventListener('click', () => closeOverlay(el));
  shareBtn.addEventListener('click', () => {
    if (prepared) share(prepared).catch((err) => err.name !== 'AbortError' && toast('Couldn’t share the photo'));
  });
  // Stop iOS from zooming the whole page on pinch.
  el.addEventListener('gesturestart', (e) => e.preventDefault());
  openOverlay(el);
  scrollTo(Math.max(0, start));
}

/** Opens the viewer over all saved photos (newest first), starting at the given photo. */
function openPhoto(id) {
  const photos = photoEntriesDesc().flatMap((e) => photosOf(e.id));
  openViewer(photos.map(viewItem), photos.findIndex((p) => p.id === id));
}

/** Lets you pick one photo from all sessions, newest first. Resolves with the item index or null. */
function pickPhoto(items, current, title) {
  return new Promise((resolve) => {
    const groups = [];
    items.forEach((item, i) => {
      const last = groups[groups.length - 1];
      if (last && last.date === item.date) last.idx.push(i);
      else groups.push({ date: item.date, idx: [i] });
    });
    groups.reverse();

    const el = document.createElement('div');
    el.className = 'picker';
    el.innerHTML = `
      <div class="picker-bar">
        <button class="tb-btn" data-cancel>Cancel</button>
        <div class="tb-title">${title}</div>
        <span></span>
      </div>
      <div class="picker-body">
        ${groups.map((g) => `
          <div class="pk-date">${g.date}</div>
          <div class="pk-row">
            ${g.idx.map((i) => `<button class="pk-thumb ${i === current ? 'on' : ''}" data-i="${i}" aria-label="${g.date}"><img src="${items[i].thumb}" alt=""></button>`).join('')}
          </div>`).join('')}
      </div>`;
    const done = (value) => {
      closeOverlay(el);
      resolve(value);
    };
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-cancel]')) done(null);
      const thumb = e.target.closest('[data-i]');
      if (thumb) done(Number(thumb.dataset.i));
    });
    openOverlay(el);
    el.querySelector('.pk-thumb.on')?.scrollIntoView({ block: 'center' });
  });
}

function openCompare() {
  const photos = entriesAsc().flatMap((e) => photosOf(e.id));
  const items = photos.map(viewItem);
  // Oldest vs newest session, both starting from that session's first shot (same pose).
  const lastEntryId = photos[photos.length - 1].entryId;
  const starts = [0, photos.findIndex((p) => p.entryId === lastEntryId)];
  let mode = localStorage.getItem('compareMode') || 'side';

  const el = document.createElement('div');
  el.className = 'viewer';
  el.innerHTML = `
    <div class="viewer-top">
      <div class="seg-dark">
        <button data-mode="side">Side by side</button>
        <button data-mode="slider">Slider</button>
      </div>
      <button class="close" data-close aria-label="Close">${ICONS.close}</button>
    </div>
    <div class="panes"></div>
    <div class="slider-view" hidden>
      <div class="sv-stage">
        <div class="sv-frame">
          <img class="sv-img" data-which="0" alt="" draggable="false">
          <img class="sv-img sv-after" data-which="1" alt="" draggable="false">
          <div class="sv-handle"><span></span></div>
          <span class="sv-tag left">Before</span>
          <span class="sv-tag right">After</span>
        </div>
      </div>
      <div class="sv-pickers">
        ${[0, 1].map((w) => `
          <div class="sv-pick">
            <button class="close" data-step="${w}:-1" aria-label="Previous photo">${ICONS.back}</button>
            <button class="pick-btn" data-label="${w}" data-pick="${w}"></button>
            <button class="close flip-x" data-step="${w}:1" aria-label="Next photo">${ICONS.back}</button>
          </div>`).join('')}
      </div>
    </div>`;

  // Side by side: two independent swipeable panes.
  const panes = $('.panes', el);
  const shown = [...starts];
  const scrollers = starts.map((_, w) => {
    const pane = document.createElement('div');
    pane.className = 'pane';
    const caption = document.createElement('button');
    caption.className = 'caption pick-btn';
    caption.dataset.pickSide = w;
    const s = buildScroller(items, (i) => {
      if (!items[i]) return;
      shown[w] = i;
      caption.innerHTML = `${items[i].date}<span class="pick-caret"></span>`;
    });
    pane.append(s.scroller, caption);
    panes.append(pane);
    return s;
  });

  // Slider: "after" is drawn over "before" and clipped at the handle.
  const picked = [...starts];
  const sliderView = $('.slider-view', el);
  const frame = $('.sv-frame', el);
  const after = $('.sv-after', el);
  const handle = $('.sv-handle', el);
  let split = 0.5;

  const setSplit = (v) => {
    split = Math.min(1, Math.max(0, v));
    after.style.clipPath = `inset(0 0 0 ${split * 100}%)`;
    handle.style.left = `${split * 100}%`;
  };
  const showPicked = () => {
    picked.forEach((i, w) => {
      const img = $(`.sv-img[data-which="${w}"]`, el);
      img.src = items[i].thumb;
      items[i].full().then((url) => url && picked[w] === i && (img.src = url));
      $(`[data-label="${w}"]`, el).innerHTML = `${w ? 'After' : 'Before'} · ${items[i].date}<span class="pick-caret"></span>`;
    });
  };
  const fitFrame = () => {
    const img = $('.sv-img', el);
    const stage = $('.sv-stage', el);
    const ar = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 3 / 4;
    const w = Math.min(stage.clientWidth, stage.clientHeight * ar);
    frame.style.width = `${w}px`;
    frame.style.height = `${w / ar}px`;
  };
  $('.sv-img', el).addEventListener('load', fitFrame);

  let dragging = false;
  const move = (e) => {
    const r = frame.getBoundingClientRect();
    setSplit((e.clientX - r.left) / r.width);
  };
  frame.addEventListener('pointerdown', (e) => {
    dragging = true;
    frame.setPointerCapture(e.pointerId);
    move(e);
  });
  frame.addEventListener('pointermove', (e) => dragging && move(e));
  frame.addEventListener('pointerup', () => (dragging = false));
  frame.addEventListener('pointercancel', () => (dragging = false));

  const setMode = (next) => {
    mode = next;
    localStorage.setItem('compareMode', mode);
    el.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    panes.hidden = mode !== 'side';
    sliderView.hidden = mode !== 'slider';
    if (mode === 'slider') {
      showPicked();
      requestAnimationFrame(fitFrame);
    } else {
      scrollers.forEach((s, i) => s.scrollTo(starts[i]));
    }
  };

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) closeOverlay(el);
    const modeBtn = e.target.closest('[data-mode]');
    if (modeBtn) setMode(modeBtn.dataset.mode);
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      const w = Number(pick.dataset.pick);
      pickPhoto(items, picked[w], w ? 'After photo' : 'Before photo').then((i) => {
        if (i == null) return;
        picked[w] = i;
        showPicked();
      });
    }
    const side = e.target.closest('[data-pick-side]');
    if (side) {
      const w = Number(side.dataset.pickSide);
      pickPhoto(items, shown[w], w ? 'Right photo' : 'Left photo').then((i) => i != null && scrollers[w].scrollTo(i));
    }
    const step = e.target.closest('[data-step]');
    if (step) {
      const [w, d] = step.dataset.step.split(':').map(Number);
      picked[w] = (picked[w] + d + items.length) % items.length;
      showPicked();
    }
  });
  el.addEventListener('gesturestart', (e) => e.preventDefault());
  window.addEventListener('resize', () => mode === 'slider' && fitFrame());

  openOverlay(el);
  setSplit(0.5);
  setMode(mode);
}

// ---------- Camera ----------
// Own camera screen so the previous session's photo can be laid over the viewfinder as a "ghost"
// for matching pose and distance. Front-camera shots are saved mirrored, exactly as previewed.

const TIMERS = [0, 3, 10];

/** ghosts: [{ load: () => Promise<url>, date }] — photos from the previous session. onShot(blob) per accepted shot. */
function openCamera({ ghosts, onShot }) {
  let facing = localStorage.getItem('camFacing') || 'user';
  let timer = Number(localStorage.getItem('camTimer')) || 0;
  let ghost = ghosts.length ? 0 : -1;
  let stream = null;
  let shooting = false;
  let reviewBlob = null;

  const el = document.createElement('div');
  el.className = 'camera';
  el.innerHTML = `
    <div class="cam-top">
      <button class="close" data-close aria-label="Close">${ICONS.close}</button>
      <div class="cam-tools">
        <button class="cam-chip" data-ghost ${ghosts.length ? '' : 'hidden'}></button>
        <button class="cam-chip" data-timer></button>
      </div>
    </div>
    <div class="cam-stage">
      <div class="cam-frame">
        <video playsinline muted autoplay></video>
        <img class="cam-ghost" alt="" hidden>
        <div class="cam-count" hidden></div>
        <div class="cam-flash"></div>
      </div>
    </div>
    <div class="cam-bottom">
      <span class="cam-hint"></span>
      <button class="shutter" data-shoot aria-label="Take photo"></button>
      <button class="close cam-flip" data-flip aria-label="Switch camera">${ICONS.flip}</button>
    </div>
    <div class="cam-review" hidden>
      <div class="cam-stage"><img alt=""></div>
      <div class="cam-review-bar">
        <button class="tb-btn" data-retake>Retake</button>
        <button class="tb-btn bold" data-use>Use photo</button>
      </div>
    </div>`;

  const video = $('video', el);
  const frame = $('.cam-frame', el);
  const stage = $('.cam-stage', el);
  const ghostImg = $('.cam-ghost', el);
  const count = $('.cam-count', el);
  const review = $('.cam-review', el);
  const hint = $('.cam-hint', el);

  // Size the frame to the camera's aspect ratio so the preview shows exactly what gets saved.
  const fit = () => {
    const ar = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 3 / 4;
    const w = Math.min(stage.clientWidth, stage.clientHeight * ar);
    frame.style.width = `${w}px`;
    frame.style.height = `${w / ar}px`;
  };

  const renderTools = () => {
    $('[data-timer]', el).textContent = timer ? `Timer ${timer}s` : 'Timer off';
    $('[data-ghost]', el).textContent = ghost < 0 ? 'Ghost off' : `Ghost ${ghost + 1}/${ghosts.length}`;
    ghostImg.hidden = ghost < 0;
    hint.textContent = ghost < 0 ? '' : ghosts[ghost].date;
    if (ghost >= 0) ghosts[ghost].load().then((url) => url && (ghostImg.src = url));
    frame.classList.toggle('mirror', facing === 'user');
  };

  const stop = () => stream?.getTracks().forEach((t) => t.stop());

  const start = async () => {
    stop();
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1440 }, height: { ideal: 1920 }, aspectRatio: { ideal: 3 / 4 } },
        audio: false,
      });
    } catch (err) {
      console.error(err);
      close();
      toast('No camera access. Allow it in Settings → Safari → Camera, or use Choose from library.');
      return;
    }
    video.srcObject = stream;
    await video.play().catch(() => {});
    fit();
    renderTools();
  };

  const capture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (facing === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
    canvas.toBlob((blob) => {
      if (!blob) return;
      reviewBlob = blob;
      $('.cam-review img', el).src = URL.createObjectURL(blob);
      review.hidden = false;
    }, 'image/jpeg', 0.92);
  };

  const shoot = async () => {
    if (shooting || !video.videoWidth) return;
    shooting = true;
    for (let n = timer; n > 0; n--) {
      count.textContent = n;
      count.hidden = false;
      await new Promise((r) => setTimeout(r, 1000));
    }
    count.hidden = true;
    capture();
    shooting = false;
  };

  const closeReview = () => {
    URL.revokeObjectURL($('.cam-review img', el).src);
    review.hidden = true;
    reviewBlob = null;
  };

  function close() {
    stop();
    closeOverlay(el);
  }

  el.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-close]')) close();
    if (t.closest('[data-shoot]')) shoot();
    if (t.closest('[data-flip]')) {
      facing = facing === 'user' ? 'environment' : 'user';
      localStorage.setItem('camFacing', facing);
      start();
    }
    if (t.closest('[data-timer]')) {
      timer = TIMERS[(TIMERS.indexOf(timer) + 1) % TIMERS.length];
      localStorage.setItem('camTimer', String(timer));
      renderTools();
    }
    if (t.closest('[data-ghost]')) {
      ghost = ghost + 1 >= ghosts.length ? -1 : ghost + 1;
      renderTools();
    }
    if (t.closest('[data-retake]')) closeReview();
    if (t.closest('[data-use]') && reviewBlob) {
      onShot(reviewBlob);
      closeReview();
      // Next pose: move the ghost to the previous session's next photo.
      if (ghost >= 0 && ghost + 1 < ghosts.length) ghost += 1;
      renderTools();
      toast('Added. Take another or close the camera.');
    }
  });
  window.addEventListener('resize', fit);

  openOverlay(el);
  start();
}

// ---------- Backup ----------
// Measurements export as one small file. Photos export per month, either as plain JPEGs
// (share sheet → Save to Photos / Files) or as a JSON backup file that can be imported back.

const bufToBase64 = (buf) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(new Blob([buf]));
  });

const base64ToBuf = (b64) => fetch(`data:application/octet-stream;base64,${b64}`).then((r) => r.arrayBuffer());

const monthKey = (iso) => iso.slice(0, 7);
const fmtMonth = (key) =>
  new Date(toTime(key + '-01')).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const fmtMB = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}

function photosInMonth(key) {
  return entriesAsc().filter((e) => monthKey(e.date) === key).flatMap((e) => photosOf(e.id));
}

/** Months that have photos, newest first, with whether everything in them was already saved. */
function photoMonths() {
  const saved = readJSON('photoBackups');
  const keys = [...new Set(photoEntriesDesc().map((e) => monthKey(e.date)))];
  return keys.map((key) => {
    const photos = photosInMonth(key);
    const newest = Math.max(...photos.map((p) => p.createdAt));
    return { key, count: photos.length, saved: saved[key] >= newest };
  });
}

function markMonthSaved(key) {
  const saved = readJSON('photoBackups');
  saved[key] = Date.now();
  localStorage.setItem('photoBackups', JSON.stringify(saved));
}

async function share(files) {
  if (navigator.canShare?.({ files })) {
    await navigator.share({ files });
    return;
  }
  for (const file of files) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
}

function fullsFor(ids) {
  const store = db.transaction('fulls').objectStore('fulls');
  return Promise.all(ids.map((id) => promisify(store.get(id))));
}

async function jpegFiles(photos) {
  const fulls = await fullsFor(photos.map((p) => p.id));
  const perDate = {};
  return photos.map((p, i) => {
    const date = state.entries.find((e) => e.id === p.entryId)?.date ?? 'photo';
    perDate[date] = (perDate[date] || 0) + 1;
    return new File([fulls[i]?.data ?? p.thumb], `body-${date}-${perDate[date]}.jpg`, { type: 'image/jpeg' });
  });
}

async function photoBackupFile(key) {
  const photos = photosInMonth(key);
  const entryIds = new Set(photos.map((p) => p.entryId));
  const fulls = await fullsFor(photos.map((p) => p.id));
  const out = [];
  for (const [i, p] of photos.entries()) {
    out.push({
      id: p.id,
      entryId: p.entryId,
      createdAt: p.createdAt,
      thumb: await bufToBase64(p.thumb),
      full: fulls[i] ? await bufToBase64(fulls[i].data) : null,
    });
  }
  const payload = {
    app: 'body-tracker',
    version: 2,
    kind: 'photos',
    exportedAt: new Date().toISOString(),
    entries: state.entries.filter((e) => entryIds.has(e.id)),
    photos: out,
  };
  return [new File([JSON.stringify(payload)], `body-tracker-photos-${key}.json`, { type: 'application/json' })];
}

function exportMeasurements() {
  // Built synchronously so the share sheet opens within the same tap.
  const payload = { app: 'body-tracker', version: 2, kind: 'measurements', exportedAt: new Date().toISOString(), entries: state.entries, photos: [] };
  const file = new File([JSON.stringify(payload)], `body-tracker-measurements-${today()}.json`, { type: 'application/json' });
  share([file])
    .then(() => {
      localStorage.setItem('lastExport', String(Date.now()));
      render();
    })
    .catch((err) => err.name !== 'AbortError' && toast('Couldn’t save the file'));
}

/**
 * iOS opens the share sheet only directly after a tap, so files are built as soon as
 * the button appears and shared on tap.
 */
function prepareShareButton(button, label, build, onShared) {
  let files = null;
  button.disabled = true;
  button.textContent = 'Preparing…';
  build()
    .then((built) => {
      files = built;
      button.textContent = `${label} · ${fmtMB(built.reduce((n, f) => n + f.size, 0))}`;
      button.disabled = false;
    })
    .catch((err) => {
      console.error(err);
      button.textContent = 'Couldn’t prepare files';
    });
  button.addEventListener('click', async () => {
    if (!files) return;
    try {
      await share(files);
      onShared();
    } catch (err) {
      if (err.name !== 'AbortError') toast('Couldn’t share the files');
    }
  });
}

function openMonthSheet(key) {
  const count = photosInMonth(key).length;
  const el = document.createElement('div');
  el.className = 'action-sheet';
  el.innerHTML = `
    <div class="as-backdrop" data-close></div>
    <div class="as-panel">
      <div class="group as-group">
        <div class="as-title"><b>${fmtMonth(key)}</b>${plural(count, 'photo')}</div>
        <button class="row as-btn" data-images></button>
        <button class="row as-btn" data-file></button>
      </div>
      <div class="group as-group">
        <button class="row as-btn bold" data-close>Cancel</button>
      </div>
    </div>`;
  const done = () => {
    markMonthSaved(key);
    closeOverlay(el);
    render();
  };
  prepareShareButton($('[data-images]', el), 'Save images', () => jpegFiles(photosInMonth(key)), done);
  prepareShareButton($('[data-file]', el), 'Backup file', () => photoBackupFile(key), done);
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) closeOverlay(el);
  });
  openOverlay(el);
}

const isBackup = (d) => d?.app === 'body-tracker' && Array.isArray(d.entries) && Array.isArray(d.photos);

async function importFiles(files) {
  const batches = [];
  for (const file of files) {
    try {
      const data = JSON.parse(await file.text());
      if (isBackup(data)) batches.push(data);
    } catch {}
  }
  if (!batches.length) {
    toast('That’s not a backup file');
    return;
  }
  const entryCount = batches.reduce((n, b) => n + (b.kind === 'photos' ? 0 : b.entries.length), 0);
  const photoCount = batches.reduce((n, b) => n + b.photos.length, 0);
  const parts = [entryCount && plural(entryCount, 'entry').replace('entrys', 'entries'), photoCount && plural(photoCount, 'photo')].filter(Boolean);
  if (!confirm(`Import ${parts.join(' and ') || 'this backup'}? Matching entries will be replaced.`)) return;

  // Photo batches go first so a measurements file imported alongside wins for the numbers.
  batches.sort((a, b) => (a.kind === 'photos' ? 0 : 1) - (b.kind === 'photos' ? 0 : 1));
  const existing = new Set(state.entries.map((e) => e.id));
  try {
    for (const data of batches) {
      const photos = [];
      for (const p of data.photos) {
        photos.push({
          meta: { id: p.id, entryId: p.entryId, createdAt: p.createdAt, thumb: await base64ToBuf(p.thumb) },
          full: p.full ? { id: p.id, data: await base64ToBuf(p.full) } : null,
        });
      }
      await write((s) => {
        for (const e of data.entries) {
          // A photo backup carries its entries only so photos are never orphaned; don't let it overwrite newer numbers.
          if (data.kind === 'photos' && existing.has(e.id)) continue;
          s.entries.put(e);
          existing.add(e.id);
        }
        for (const { meta, full } of photos) {
          s.photos.put(meta);
          if (full) s.fulls.put(full);
        }
      });
      photos.forEach(({ meta }) => dropUrls(meta.id));
    }
    await loadState();
    render();
    toast('Imported');
  } catch (err) {
    console.error(err);
    toast('Import failed. Try importing the files one at a time.');
  }
}

// ---------- Wiring ----------

const actions = {
  tab: ({ tab }) => {
    if (state.tab === tab) state.metric = null;
    state.tab = tab;
    if (tab !== 'progress') state.metric = null;
    render();
    window.scrollTo(0, 0);
  },
  'open-metric': ({ key }) => {
    state.metric = key;
    render();
    window.scrollTo(0, 0);
  },
  back: () => {
    state.metric = null;
    render();
  },
  range: ({ range }) => {
    state.range = range;
    render();
  },
  'new-entry': () => openEditor(null),
  'edit-entry': ({ id }) => openEditor(state.entries.find((e) => e.id === id)),
  'open-photo': ({ id }) => openPhoto(id),
  compare: () => openCompare(),
  'export-measurements': () => exportMeasurements(),
  'month-backup': ({ month }) => openMonthSheet(month),
};

$('#app').addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (el) actions[el.dataset.action]?.(el.dataset, el);
});

$('#app').addEventListener('change', (e) => {
  if (e.target.matches('[data-import]') && e.target.files.length) {
    const files = [...e.target.files];
    e.target.value = '';
    importFiles(files);
  }
});

async function loadState() {
  [state.entries, state.photos] = await Promise.all([getAll('entries'), getAll('photos')]);
  await migrateSides();
}

/** Older versions stored one value for paired metrics; it becomes both Left and Right. */
async function migrateSides() {
  const changed = [];
  for (const e of state.entries) {
    for (const m of METRICS.filter((x) => x.paired)) {
      const v = e.values[m.key];
      if (v == null) continue;
      e.values[m.key + 'L'] ??= v;
      e.values[m.key + 'R'] ??= v;
      delete e.values[m.key];
      if (!changed.includes(e)) changed.push(e);
    }
  }
  if (changed.length) await write((s) => changed.forEach((e) => s.entries.put(e)));
}

async function start() {
  try {
    db = await openDB();
    await loadState();
  } catch (err) {
    console.error(err);
    $('#app').innerHTML = '<div class="empty"><h2>Storage unavailable</h2><p>Safari blocked access to storage. Don’t use Private Browsing.</p></div>';
    return;
  }
  render();
  navigator.storage?.persist?.();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
}

start();
