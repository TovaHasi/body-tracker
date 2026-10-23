// ---------- Constants ----------

const METRICS = [
  { key: 'weight', title: 'Вес', unit: 'кг' },
  { key: 'bodyFat', title: 'Жир', unit: '%' },
  { key: 'neck', title: 'Шея', unit: 'см' },
  { key: 'shoulders', title: 'Плечи', unit: 'см' },
  { key: 'chest', title: 'Грудь', unit: 'см' },
  { key: 'biceps', title: 'Бицепс', unit: 'см' },
  { key: 'forearm', title: 'Предплечье', unit: 'см' },
  { key: 'waist', title: 'Талия', unit: 'см' },
  { key: 'hips', title: 'Ягодицы', unit: 'см' },
  { key: 'thigh', title: 'Бедро', unit: 'см' },
  { key: 'calf', title: 'Икра', unit: 'см' },
];
const METRIC = Object.fromEntries(METRICS.map((m) => [m.key, m]));

const RANGES = [
  { key: '1m', label: '1М', months: 1 },
  { key: '3m', label: '3М', months: 3 },
  { key: '6m', label: '6М', months: 6 },
  { key: '1y', label: '1Г', months: 12 },
  { key: 'all', label: 'Всё', months: null },
];

const TABS = [
  { key: 'progress', title: 'Прогресс', icon: 'chart' },
  { key: 'history', title: 'Замеры', icon: 'list' },
  { key: 'photos', title: 'Фото', icon: 'photo' },
];

const ICONS = {
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5.5-5.5 4 4L21 7"/><path d="M3 21h18"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-9 9"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  back: '<svg viewBox="0 0 13 21" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2L2.5 10.5 11 19"/></svg>',
  close: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>',
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

const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const nfSigned = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1, signDisplay: 'exceptZero' });
const fmt = (v) => nf.format(v);
const fmtSigned = (v) => nfSigned.format(v);
const stripYear = (s) => s.replace(/\s+г\.$/, '');
const fmtDate = (iso) =>
  stripYear(new Date(toTime(iso)).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }));
const fmtDateShort = (iso) =>
  stripYear(new Date(toTime(iso)).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));

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
    el.innerHTML = '<div class="chart-empty">Нет данных за период</div>';
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

const plusButton = '<button class="tb-btn" data-action="new-entry" aria-label="Новый замер">' + ICONS.plus + '</button>';

function emptyState(title, text) {
  return `<div class="empty">${ICONS.ruler}<h2>${title}</h2><p>${text}</p>
    <button class="pill" data-action="new-entry">Добавить замер</button></div>`;
}

function viewProgress() {
  const metrics = METRICS.filter((m) => state.entries.some((e) => e.values[m.key] != null));
  if (!metrics.length) {
    return { title: 'Прогресс', large: true, actions: plusButton, body: emptyState('Нет замеров', 'Добавь первый замер, чтобы видеть прогресс') };
  }
  const rows = metrics.map((m) => {
    const pts = points(m.key);
    const last = pts[pts.length - 1];
    const delta = pts.length > 1 ? last.v - pts[0].v : null;
    return `<button class="row metric-row" data-action="open-metric" data-key="${m.key}">
      <div class="grow">
        <div class="mr-title">${m.title}</div>
        <div class="mr-value">${fmt(last.v)}<span class="unit">${m.unit}</span></div>
        ${delta != null ? `<div class="mr-delta">${fmtSigned(delta)} ${m.unit} с начала</div>` : ''}
      </div>
      ${pts.length > 1 ? sparkline(pts) : ''}
      <span class="chev"></span>
    </button>`;
  });
  return { title: 'Прогресс', large: true, actions: plusButton, body: `<div class="group">${rows.join('')}</div>` };
}

function viewMetric(key) {
  const m = METRIC[key];
  const all = points(key);
  const pts = inRange(all, state.range);
  const last = pts[pts.length - 1];
  const change = pts.length > 1 ? last.v - pts[0].v : null;
  const changeText = change != null ? `${fmtSigned(change)} ${m.unit} за период` : '';

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
    <div class="group-title">История</div>
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
  const backup = `
    <div class="group-title">Бэкап</div>
    <div class="group">
      <button class="row action" data-action="export">Экспортировать данные</button>
      <label class="row action">Импортировать из файла
        <input type="file" accept=".json,application/json" hidden data-import>
      </label>
    </div>
    <div class="group-foot">Данные хранятся только на этом телефоне. Время от времени сохраняй бэкап в Файлы или iCloud.
      ${lastExport ? `Последний бэкап: ${fmtDate(isoDate(new Date(lastExport)))}.` : ''}</div>`;

  const entries = entriesDesc();
  if (!entries.length) {
    return { title: 'Замеры', large: true, actions: plusButton, body: emptyState('Нет замеров', 'Здесь будет история всех замеров') + '<div style="height:32px"></div>' + backup };
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
  return { title: 'Замеры', large: true, actions: plusButton, body: `<div class="group">${rows.join('')}</div>${backup}` };
}

function photoEntriesDesc() {
  return entriesDesc().filter((e) => photosOf(e.id).length);
}

function viewPhotos() {
  const groups = photoEntriesDesc();
  if (!groups.length) {
    return { title: 'Фото', large: true, body: emptyState('Нет фото', 'Прикрепляй фото к замерам, чтобы видеть изменения') };
  }
  const total = groups.reduce((n, e) => n + photosOf(e.id).length, 0);
  const body = groups.map((e) => `
    <div class="ph-date">${fmtDate(e.date)}</div>
    <div class="ph-grid">
      ${photosOf(e.id).map((p) => `<button class="ph-cell" data-action="open-photo" data-id="${p.id}"><img src="${thumbUrl(p)}" loading="lazy" alt=""></button>`).join('')}
    </div>`).join('');
  const actions = total > 1 ? '<button class="tb-btn" data-action="compare">Сравнить</button>' : '';
  return { title: 'Фото', large: true, actions, body };
}

function currentView() {
  if (state.tab === 'progress') return state.metric ? viewMetric(state.metric) : viewProgress();
  if (state.tab === 'history') return viewHistory();
  return viewPhotos();
}

function render() {
  const view = currentView();
  const back = view.back
    ? `<button class="tb-btn back" data-action="back">${ICONS.back}<span>Прогресс</span></button>`
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
      <button class="tb-btn" data-e="cancel">Отмена</button>
      <div class="tb-title">${entry ? 'Замер' : 'Новый замер'}</div>
      <button class="tb-btn" data-e="save">Сохранить</button>
    </div>
    <div class="sheet-body">
      <div class="group">
        <label class="row field"><span class="grow">Дата</span><input type="date" value="${entry?.date ?? today()}" data-date></label>
      </div>
      <div class="group-title">Замеры</div>
      <div class="group">
        ${METRICS.map((m) => `
          <label class="row field">
            <span class="grow">${m.title}</span>
            <input inputmode="decimal" autocomplete="off" data-m="${m.key}"
              value="${entry?.values[m.key] != null ? String(entry.values[m.key]).replace('.', ',') : ''}"
              placeholder="${previous?.values[m.key] != null ? fmt(previous.values[m.key]) : '—'}">
            <span class="unit">${m.unit}</span>
          </label>`).join('')}
      </div>
      <div class="group-title">Фото</div>
      <div class="group">
        <div class="strip" hidden></div>
        <label class="row action">Добавить фото
          <input type="file" accept="image/*" multiple hidden data-photos>
        </label>
      </div>
      <div class="group-title">Заметка</div>
      <div class="group">
        <textarea class="note" rows="2" placeholder="Необязательно" data-note>${esc(entry?.note ?? '')}</textarea>
      </div>
      ${entry ? '<div class="group"><button class="row danger" data-e="delete">Удалить замер</button></div>' : ''}
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
          <button class="strip-remove" data-e="remove-photo" data-id="${p.id}" aria-label="Убрать">${ICONS.close}</button>
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
        toast('Не удалось открыть фото');
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
        toast('Не удалось сохранить');
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
      if (!confirm('Удалить этот замер вместе с фото?')) return;
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
    <div class="viewer-top"><span data-caption></span><button class="close" data-close aria-label="Закрыть">${ICONS.close}</button></div>
    <div class="panes"><div class="pane"></div></div>
    <div class="caption"></div>`;
  const caption = $('[data-caption]', el);
  const { scroller, scrollTo } = buildScroller(photos, (i) => {
    if (photos[i]) caption.textContent = photoDate(photos[i]);
  });
  $('.pane', el).append(scroller);
  $('[data-close]', el).addEventListener('click', () => closeOverlay(el));
  openOverlay(el);
  scrollTo(Math.max(0, photos.findIndex((p) => p.id === startId)));
}

function openCompare() {
  const photos = entriesAsc().flatMap((e) => photosOf(e.id));
  const el = document.createElement('div');
  el.className = 'viewer';
  el.innerHTML = `
    <div class="viewer-top"><span>Листай каждую половину</span><button class="close" data-close aria-label="Закрыть">${ICONS.close}</button></div>
    <div class="panes"></div>`;
  const panes = $('.panes', el);
  const starts = [0, photos.length - 1];
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

const bufToBase64 = (buf) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(new Blob([buf]));
  });

const base64ToBuf = (b64) => fetch(`data:application/octet-stream;base64,${b64}`).then((r) => r.arrayBuffer());

let preparedExport = null;

async function exportData(button) {
  // iOS only allows the share sheet right after a tap, so prepare first, then share on the next tap.
  if (preparedExport) {
    const file = preparedExport;
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
      localStorage.setItem('lastExport', String(Date.now()));
      preparedExport = null;
      render();
    } catch (err) {
      if (err.name !== 'AbortError') toast('Не удалось сохранить файл');
    }
    return;
  }

  button.textContent = 'Готовлю файл…';
  button.disabled = true;
  try {
    const fulls = new Map((await getAll('fulls')).map((f) => [f.id, f.data]));
    const photos = [];
    for (const p of state.photos) {
      photos.push({
        id: p.id,
        entryId: p.entryId,
        createdAt: p.createdAt,
        thumb: await bufToBase64(p.thumb),
        full: fulls.has(p.id) ? await bufToBase64(fulls.get(p.id)) : null,
      });
    }
    const payload = { app: 'body-tracker', version: 1, exportedAt: new Date().toISOString(), entries: state.entries, photos };
    preparedExport = new File([JSON.stringify(payload)], `body-tracker-${today()}.json`, { type: 'application/json' });
    const mb = (preparedExport.size / 1024 / 1024).toFixed(1).replace('.', ',');
    button.textContent = `Сохранить бэкап (${mb} МБ)`;
  } catch (err) {
    console.error(err);
    button.textContent = 'Экспортировать данные';
    toast('Не удалось подготовить бэкап');
  }
  button.disabled = false;
}

async function importData(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    toast('Это не файл бэкапа');
    return;
  }
  if (data?.app !== 'body-tracker' || !Array.isArray(data.entries) || !Array.isArray(data.photos)) {
    toast('Это не файл бэкапа');
    return;
  }
  if (!confirm(`Импортировать ${data.entries.length} замеров и ${data.photos.length} фото? Совпадающие записи будут заменены.`)) return;

  try {
    const photos = [];
    for (const p of data.photos) {
      photos.push({
        meta: { id: p.id, entryId: p.entryId, createdAt: p.createdAt, thumb: await base64ToBuf(p.thumb) },
        full: p.full ? { id: p.id, data: await base64ToBuf(p.full) } : null,
      });
    }
    await write((s) => {
      data.entries.forEach((e) => s.entries.put(e));
      photos.forEach(({ meta, full }) => {
        s.photos.put(meta);
        if (full) s.fulls.put(full);
      });
    });
    photos.forEach(({ meta }) => dropUrls(meta.id));
    await loadState();
    render();
    toast('Готово');
  } catch (err) {
    console.error(err);
    toast('Не удалось импортировать');
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
  export: (_, el) => exportData(el),
};

$('#app').addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (el) actions[el.dataset.action]?.(el.dataset, el);
});

$('#app').addEventListener('change', (e) => {
  if (e.target.matches('[data-import]') && e.target.files[0]) {
    const file = e.target.files[0];
    e.target.value = '';
    importData(file);
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
    $('#app').innerHTML = '<div class="empty"><h2>Хранилище недоступно</h2><p>Safari не дал доступ к данным. Не используй приватный режим.</p></div>';
    return;
  }
  render();
  navigator.storage?.persist?.();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
}

start();
