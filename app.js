// ---------- Constants ----------

const METRICS = [
  { key: 'weight', title: 'Weight', unit: 'kg' },
  { key: 'bodyFat', title: 'Body fat', unit: '%' },
  { key: 'neck', title: 'Neck', unit: 'cm' },
  { key: 'shoulders', title: 'Shoulders', unit: 'cm' },
  { key: 'chest', title: 'Chest', unit: 'cm' },
  { key: 'biceps', title: 'Biceps', unit: 'cm' },
  { key: 'forearm', title: 'Forearm', unit: 'cm' },
  { key: 'waist', title: 'Waist', unit: 'cm' },
  { key: 'hips', title: 'Hips', unit: 'cm' },
  { key: 'thigh', title: 'Thigh', unit: 'cm' },
  { key: 'calf', title: 'Calf', unit: 'cm' },
];
const METRIC = Object.fromEntries(METRICS.map((m) => [m.key, m]));

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

function scales(pts, w, h, pad) {
  const [lo, hi] = domain(pts.map((p) => p.v));
  const t0 = pts[0].t;
  const t1 = pts[pts.length - 1].t;
  const x = (t) => (t1 === t0 ? pad.l + (w - pad.l - pad.r) / 2 : pad.l + ((t - t0) / (t1 - t0)) * (w - pad.l - pad.r));
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (h - pad.t - pad.b);
  return { x, y, lo, hi };
}

function sparkline(pts) {
  const w = 90;
  const h = 36;
  const { x, y } = scales(pts, w, h, { l: 2, r: 2, t: 3, b: 3 });
  const xy = pts.map((p) => [x(p.t), y(p.v)]);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}"><path d="${smoothPath(xy)}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function mountChart(el, pts, onSelect) {
  if (!pts.length) {
    el.innerHTML = '<div class="chart-empty">No data for this period</div>';
    return;
  }
  const w = el.clientWidth;
  const h = el.clientHeight;
  const pad = { l: 6, r: 40, t: 10, b: 24 };
  const { x, y, lo, hi } = scales(pts, w, h, pad);
  const xy = pts.map((p) => [x(p.t), y(p.v)]);

  const step = niceStep((hi - lo) / 3);
  const ticks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);

  const grid = ticks
    .map((v) => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--sep)" stroke-width="0.5"/>
      <text x="${w - pad.r + 6}" y="${y(v) + 4}">${fmt(v)}</text>`)
    .join('');

  const first = pts[0];
  const last = pts[pts.length - 1];
  const xLabels = `<text x="${pad.l}" y="${h - 4}">${fmtDateShort(first.date)}</text>` +
    (pts.length > 1 ? `<text x="${w - pad.r}" y="${h - 4}" text-anchor="end">${fmtDateShort(last.date)}</text>` : '');

  const line = pts.length > 1
    ? `<path d="${smoothPath(xy)}" fill="none" stroke="var(--text)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`
    : '';
  const dots = pts.length <= 30
    ? xy.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="3" fill="var(--text)"/>`).join('')
    : '';

  el.innerHTML = `<svg>${grid}${xLabels}${line}${dots}<g class="sel"></g></svg>`;
  const svg = el.querySelector('svg');
  const sel = el.querySelector('.sel');

  const pick = (clientX) => {
    const px = clientX - svg.getBoundingClientRect().left;
    let best = 0;
    xy.forEach(([cx], i) => {
      if (Math.abs(cx - px) < Math.abs(xy[best][0] - px)) best = i;
    });
    const [cx, cy] = xy[best];
    sel.innerHTML = `<line x1="${cx}" x2="${cx}" y1="${pad.t}" y2="${h - pad.b}" stroke="var(--ter)" stroke-width="1"/>
      <circle cx="${cx}" cy="${cy}" r="6" fill="var(--text)" stroke="var(--card)" stroke-width="2"/>`;
    onSelect(pts[best]);
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

function viewProgress() {
  const metrics = METRICS.filter((m) => state.entries.some((e) => e.values[m.key] != null));
  if (!metrics.length) {
    return { title: 'Progress', large: true, actions: plusButton, body: emptyState('No entries yet', 'Add your first measurements to start tracking') };
  }
  const rows = metrics.map((m) => {
    const pts = points(m.key);
    const last = pts[pts.length - 1];
    const delta = pts.length > 1 ? last.v - pts[0].v : null;
    return `<button class="row metric-row" data-action="open-metric" data-key="${m.key}">
      <div class="grow">
        <div class="mr-title">${m.title}</div>
        <div class="mr-value">${fmt(last.v)}<span class="unit">${m.unit}</span></div>
        ${delta != null ? `<div class="mr-delta">${fmtSigned(delta)} ${m.unit} since start</div>` : ''}
      </div>
      ${pts.length > 1 ? sparkline(pts) : ''}
      <span class="chev"></span>
    </button>`;
  });
  return { title: 'Progress', large: true, actions: plusButton, body: `<div class="group">${rows.join('')}</div>` };
}

function viewMetric(key) {
  const m = METRIC[key];
  const all = points(key);
  const pts = inRange(all, state.range);
  const last = pts[pts.length - 1];
  const change = pts.length > 1 ? last.v - pts[0].v : null;
  const changeText = change != null ? `${fmtSigned(change)} ${m.unit} this period` : '';

  const body = `
    <div class="group detail">
      <div class="d-value"><span id="d-value">${last ? fmt(last.v) : '—'}</span><span class="unit">${m.unit}</span></div>
      <div class="d-sub" id="d-date">${last ? fmtDate(last.date) : ''}</div>
      <div class="d-sub" id="d-change">${changeText}</div>
      <div class="chart" id="chart"></div>
      <div class="segmented">
        ${RANGES.map((r) => `<button data-action="range" data-range="${r.key}" class="${r.key === state.range ? 'on' : ''}">${r.label}</button>`).join('')}
      </div>
    </div>
    <div class="group-title">History</div>
    <div class="group">
      ${[...all].reverse().map((p) => `
        <button class="row" data-action="edit-entry" data-id="${p.entry.id}">
          <span class="grow">${fmtDate(p.date)}</span>
          <span class="sec num">${fmt(p.v)} ${m.unit}</span>
        </button>`).join('')}
    </div>`;

  const after = () =>
    mountChart($('#chart'), pts, (p) => {
      const shown = p || last;
      $('#d-value').textContent = shown ? fmt(shown.v) : '—';
      $('#d-date').textContent = shown ? fmtDate(shown.date) : '';
      $('#d-change').textContent = p ? '' : changeText;
    });

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
    const summary = METRICS.filter((m) => e.values[m.key] != null)
      .map((m) => `${m.title.toLowerCase()} ${fmt(e.values[m.key])}`)
      .join(' · ');
    const photo = photosOf(e.id)[0];
    return `<button class="row" data-action="edit-entry" data-id="${e.id}">
      <div class="grow">
        <div class="er-date">${fmtDate(e.date)}</div>
        ${summary ? `<div class="er-sum num">${summary}</div>` : ''}
        ${e.note ? `<div class="er-sum">${esc(e.note)}</div>` : ''}
      </div>
      ${photo ? `<img class="er-thumb" src="${thumbUrl(photo)}" alt="">` : ''}
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
        ${METRICS.map((m) => `
          <label class="row field">
            <span class="grow">${m.title}</span>
            <input inputmode="decimal" autocomplete="off" data-m="${m.key}"
              value="${entry?.values[m.key] != null ? String(entry.values[m.key]) : ''}"
              placeholder="${previous?.values[m.key] != null ? fmt(previous.values[m.key]) : '—'}">
            <span class="unit">${m.unit}</span>
          </label>`).join('')}
      </div>
      <div class="group-title">Photos</div>
      <div class="group">
        <div class="strip" hidden></div>
        <label class="row action">Add photos
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
          <img src="${p.url}" alt="">
          <button class="strip-remove" data-e="remove-photo" data-id="${p.id}" aria-label="Remove">${ICONS.close}</button>
        </div>`).join('') +
      '<div class="strip-item loading"></div>'.repeat(pending);
    updateSave();
  };

  const close = () => {
    photos.filter((p) => !p.existing).forEach((p) => URL.revokeObjectURL(p.url));
    closeOverlay(el);
  };

  el.addEventListener('input', updateSave);

  $('[data-photos]', el).addEventListener('change', async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    pending += files.length;
    renderStrip();
    for (const file of files) {
      try {
        const { full, thumb } = await processImage(file);
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
  });

  el.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-e]');
    if (!target) return;
    const action = target.dataset.e;

    if (action === 'cancel') close();

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
      if (state.metric && !state.entries.some((x) => x.values[state.metric] != null)) state.metric = null;
      close();
      render();
    }
  });

  renderStrip();
  openOverlay(el);
}

// ---------- Photo viewer & compare ----------

/** Horizontal snap scroller; loads full-size images as slides come into view. */
function buildScroller(photos, onIndex) {
  const scroller = document.createElement('div');
  scroller.className = 'scroller';
  scroller.innerHTML = photos
    .map((p) => `<div class="slide"><img src="${thumbUrl(p)}" data-id="${p.id}" alt=""></div>`)
    .join('');

  const observer = new IntersectionObserver(
    (items) => {
      for (const item of items) {
        if (!item.isIntersecting) continue;
        const img = item.target;
        observer.unobserve(img);
        fullUrl(img.dataset.id).then((url) => url && (img.src = url));
      }
    },
    { root: scroller, rootMargin: '0px 100%' }
  );
  scroller.querySelectorAll('img').forEach((img) => observer.observe(img));

  const index = () => Math.round(scroller.scrollLeft / Math.max(1, scroller.clientWidth));
  scroller.addEventListener('scroll', () => onIndex(index()), { passive: true });

  return {
    scroller,
    scrollTo: (i) => {
      scroller.scrollLeft = i * scroller.clientWidth;
      onIndex(i);
    },
  };
}

function photoDate(photo) {
  const entry = state.entries.find((e) => e.id === photo.entryId);
  return entry ? fmtDate(entry.date) : '';
}

function openViewer(startId) {
  const photos = photoEntriesDesc().flatMap((e) => photosOf(e.id));
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
    <div class="caption"></div>`;
  const caption = $('[data-caption]', el);
  const shareBtn = $('[data-share]', el);
  // The current photo's file is prepared ahead so the share sheet opens within the tap.
  let current = null;
  let prepared = null;
  const { scroller, scrollTo } = buildScroller(photos, (i) => {
    const photo = photos[i];
    if (!photo || photo === current) return;
    current = photo;
    prepared = null;
    shareBtn.disabled = true;
    caption.textContent = photoDate(photo);
    jpegFiles([photo]).then((files) => {
      if (current !== photo) return;
      prepared = files;
      shareBtn.disabled = false;
    });
  });
  $('.pane', el).append(scroller);
  $('[data-close]', el).addEventListener('click', () => closeOverlay(el));
  shareBtn.addEventListener('click', () => {
    if (prepared) share(prepared).catch((err) => err.name !== 'AbortError' && toast('Couldn’t share the photo'));
  });
  openOverlay(el);
  scrollTo(Math.max(0, photos.findIndex((p) => p.id === startId)));
}

function openCompare() {
  const photos = entriesAsc().flatMap((e) => photosOf(e.id));
  const el = document.createElement('div');
  el.className = 'viewer';
  el.innerHTML = `
    <div class="viewer-top"><span>Swipe each side</span><button class="close" data-close aria-label="Close">${ICONS.close}</button></div>
    <div class="panes"></div>`;
  const panes = $('.panes', el);
  // Oldest vs newest session, both starting from that session's first shot (same pose).
  const lastEntryId = photos[photos.length - 1].entryId;
  const starts = [0, photos.findIndex((p) => p.entryId === lastEntryId)];
  const scrollers = starts.map(() => {
    const pane = document.createElement('div');
    pane.className = 'pane';
    const caption = document.createElement('div');
    caption.className = 'caption';
    const s = buildScroller(photos, (i) => {
      if (photos[i]) caption.textContent = photoDate(photos[i]);
    });
    pane.append(s.scroller, caption);
    panes.append(pane);
    return s;
  });
  $('[data-close]', el).addEventListener('click', () => closeOverlay(el));
  openOverlay(el);
  scrollers.forEach((s, i) => s.scrollTo(starts[i]));
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
  'open-photo': ({ id }) => openViewer(id),
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
