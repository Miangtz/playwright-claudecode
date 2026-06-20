// Front del dashboard. Pide la lista de pruebas, escucha los eventos en vivo
// del servidor (SSE) y va pintando los pasos a medida que Playwright los ejecuta.

const SITE_EMOJI = { saucedemo: '🛒', adidasmx: '👟' };
const STATUS_TEXT = {
  passed: 'PASÓ',
  failed: 'FALLÓ',
  timedOut: 'FALLÓ',
  skipped: 'OMITIDO',
  running: 'CORRIENDO',
};

const rowByKey = new Map(); // "feature :: scenario" -> fila del catálogo
const keyOf = (feature, scenario) => `${feature} :: ${scenario}`;

let liveBlocks = new Map(); // bloques del panel "en vivo" durante una corrida
let tally = { passed: 0, failed: 0 };

// --------------------------------------------------------------- utilidades
const $ = (sel) => document.querySelector(sel);
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}
function fmtWhen(at, durationMs) {
  if (!at) return 'Sin correr todavía';
  const when = new Date(at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  const secs = durationMs ? ` · ${(durationMs / 1000).toFixed(1)}s` : '';
  return `Última: ${when}${secs}`;
}

// ----------------------------------------------------------- pintar catálogo
async function loadCatalog() {
  const data = await fetch('/api/tests').then((r) => r.json());
  const root = $('#catalog');
  root.innerHTML = '';
  rowByKey.clear();
  let totalAll = 0;
  let passing = 0;
  let failing = 0;

  for (const site of data.sites) {
    const total = site.features.reduce((n, f) => n + f.scenarios.length, 0);
    const section = el('section', 'site');

    const title = el('h3', 'site-title');
    title.append(`${SITE_EMOJI[site.site] || '📁'} ${site.site}`);
    title.append(el('span', 'count', `${total} escenario${total !== 1 ? 's' : ''}`));
    const siteBtn = el('button', 'btn btn-small site-run run-btn', 'Correr sitio');
    siteBtn.onclick = () => run({ mode: 'site', site: site.site });
    title.append(siteBtn);
    section.append(title);

    for (const feat of site.features) {
      const card = el('div', 'feature');
      card.append(el('div', 'feature-head', feat.feature));

      for (const sc of feat.scenarios) {
        totalAll++;
        if (sc.last?.status === 'passed') passing++;
        else if (sc.last?.status === 'failed' || sc.last?.status === 'timedOut') failing++;

        const row = el('div', 'scenario');
        const status = sc.last?.status || 'none';

        const badge = el('div', `badge ${status}`, STATUS_TEXT[status] || 'SIN CORRER');

        const info = el('div', 'scenario-info');
        const name = el('div', 'scenario-name', sc.name);
        const meta = el('div', 'scenario-meta', fmtWhen(sc.last?.at, sc.last?.durationMs));
        const steps = el('div', 'scenario-steps');
        for (const st of sc.steps) steps.append(el('span', null, st));
        name.style.cursor = 'pointer';
        name.title = 'Ver los pasos';
        name.onclick = () => steps.classList.toggle('show');
        info.append(name, meta, steps);

        const btn = el('button', 'btn btn-small run-btn', 'Correr');
        btn.onclick = () => run({ mode: 'scenario', site: site.site, scenario: sc.name });

        row.append(badge, info);
        if (status === 'failed' || status === 'timedOut') {
          const diagBtn = el('button', 'btn btn-small run-btn diag-btn', '✦ ¿Por qué falló?');
          diagBtn.onclick = () => diagnose(feat.feature, sc.name, row);
          row.append(diagBtn);
        }
        row.append(btn);
        section.append(card);
        card.append(row);
        rowByKey.set(keyOf(feat.feature, sc.name), { row, badge, meta });
      }
    }
    root.append(section);
  }

  $('#stat-total').textContent = totalAll;
  $('#stat-sites').textContent = data.sites.length;
  $('#stat-pass').textContent = passing;
  $('#stat-fail').textContent = failing;
  $('#stat-pass').classList.toggle('ok', passing > 0);
  $('#stat-fail').classList.toggle('bad', failing > 0);
}

// ---------------------------------------------------------------- correr
let running = false;
function setRunning(on) {
  running = on;
  document.querySelectorAll('.run-btn').forEach((b) => (b.disabled = on));
  $('#run-all').disabled = on;
}
async function run(body) {
  if (running) return;
  const res = await fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    alert(error || 'No se pudo iniciar la corrida.');
  }
}

// ----------------------------------------------------- diagnóstico con IA
// "¿Por qué falló?": abre una tarjeta debajo de la fila y va mostrando lo que
// el agente investiga, con una barrita de avance. Al final pinta el veredicto.
let diag = null; // { key, card, head, bar, feed, lastLabel } mientras analiza

function diagnose(feature, scenario, row) {
  if (running) return;
  document.querySelectorAll('.diag-card').forEach((c) => c.remove());

  const card = el('div', 'diag-card');
  const head = el('div', 'diag-head');
  head.append(el('span', null, '✦ Analizando por qué falló…'));
  const close = el('button', 'diag-close', '✕');
  close.onclick = () => {
    card.remove();
    if (diag?.card === card) diag = null;
  };
  head.append(close);
  const barWrap = el('div', 'diag-bar-wrap');
  const bar = el('div', 'diag-bar');
  barWrap.append(bar);
  const feed = el('div', 'diag-feed');
  card.append(head, barWrap, feed);
  row.after(card);

  diag = { key: keyOf(feature, scenario), card, head, bar, feed, lastLabel: '' };

  fetch('/api/diagnose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feature, scenario }),
  }).then(async (res) => {
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      card.remove();
      diag = null;
      alert(error || 'No se pudo iniciar el diagnóstico.');
    }
  });
}

// Colorea el chip según el tipo de fallo que diagnosticó la IA.
function typeClass(tipo = '') {
  if (tipo.includes('locator')) return 't-locator';
  if (tipo.includes('timing')) return 't-timing';
  if (tipo.includes('ambiente')) return 't-ambiente';
  if (tipo.includes('lógica') || tipo.includes('logica')) return 't-logica';
  return 't-otro';
}

function diagStepDone() {
  const prev = diag.feed.querySelector('.step.run');
  if (prev) {
    prev.className = 'step ok';
    prev.querySelector('.mark').textContent = '✓';
  }
}

function handleDiag(ev) {
  // Lock global: mientras hay diagnóstico no se puede correr nada (y al revés)
  if (ev.kind === 'start') setRunning(true);
  if (ev.kind === 'done' || ev.kind === 'fail') setRunning(false);
  if (!diag || ev.key !== diag.key) return; // diagnóstico lanzado desde otra pestaña

  if (ev.kind === 'start' || ev.kind === 'activity') {
    diag.bar.style.width = `${ev.pct || 5}%`;
    if (ev.label && ev.label !== diag.lastLabel) {
      diag.lastLabel = ev.label;
      diagStepDone();
      const step = el('div', 'step run');
      step.append(el('span', 'mark', '▶'), el('span', 'txt', ev.label));
      diag.feed.append(step);
    }
    return;
  }

  if (ev.kind === 'done') {
    diag.bar.style.width = '100%';
    diagStepDone();
    diag.head.firstChild.textContent = '✦ Diagnóstico del coworker';
    const r = ev.result || {};
    const result = el('div', 'diag-result');
    result.append(el('span', `type-chip ${typeClass((r.tipo || '').toLowerCase())}`, (r.tipo || 'análisis').toUpperCase()));
    if (r.explicacion) result.append(el('p', 'diag-expl', r.explicacion));
    if (r.fix) {
      result.append(el('div', 'diag-fix-label', 'Fix propuesto'));
      result.append(el('pre', 'diag-fix', r.fix));
    }
    if (r.archivos?.length) result.append(el('p', 'diag-files', `Archivos: ${r.archivos.join(' · ')}`));
    result.append(el('p', 'diag-saved', '✓ Quedó registrado en la memoria del proyecto'));
    diag.card.append(result);
    diag = null;
    memoryStale = true; // la pestaña Memoria se recarga sola la próxima vez
    return;
  }

  if (ev.kind === 'fail') {
    diagStepDone();
    diag.head.firstChild.textContent = '✦ No pude terminar el diagnóstico';
    diag.card.append(el('p', 'diag-error', ev.error || 'Algo salió mal. Probá de nuevo.'));
    diag = null;
  }
}

// ----------------------------------------------------- pestaña Memoria
const SITE_ICON = (name = '') =>
  name.toLowerCase().includes('sauce') ? '🛒' : name.toLowerCase().includes('adidas') ? '👟' : '🌐';
const ACTION_CLASS = { Agregado: 'agregado', Modificado: 'modificado', Eliminado: 'eliminado' };
let memoryStale = true;

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function kv(label, value) {
  const line = el('div', 'mem-kv');
  line.append(el('b', null, label), el('span', null, value));
  return line;
}

async function loadMemory(force = false) {
  if (!memoryStale && !force) return;
  const data = await fetch('/api/memory').then((r) => r.json());
  memoryStale = false;

  // Problemas conocidos: tarjetas con chip Activo/Resuelto
  const issuesRoot = $('#memory-issues');
  issuesRoot.innerHTML = '';
  for (const it of data.issues) {
    const card = el('div', 'mem-card');
    const headRow = el('div', 'mem-card-head');
    headRow.append(el('span', `chip ${it.status}`, it.status.toUpperCase()), el('span', 'mem-title', it.title));
    card.append(headRow);
    const f = it.fields;
    card.append(
      el('div', 'mem-meta', `${SITE_ICON(it.site)} ${it.site}${f['Detectado'] ? ` · Detectado: ${fmtDate(f['Detectado'])}` : ''}`),
    );
    if (f['Problema']) card.append(el('p', 'mem-text', f['Problema']));
    if (f['Impacto']) card.append(kv('Impacto', f['Impacto']));
    if (f['Workaround']) card.append(kv('Workaround', f['Workaround']));
    if (f['Fix']) card.append(kv('Fix', f['Fix']));
    issuesRoot.append(card);
  }
  if (!data.issues.length) issuesRoot.append(el('p', 'mem-empty', 'Sin problemas conocidos registrados. 🎉'));

  // Historial de fallos: tarjetas con chip del tipo
  const failRoot = $('#memory-failures');
  failRoot.innerHTML = '';
  for (const fa of data.failures) {
    const card = el('div', 'mem-card');
    const headRow = el('div', 'mem-card-head');
    headRow.append(el('span', `type-chip ${typeClass(fa.tipo)}`, fa.fields['Tipo'] || 'fallo'), el('span', 'mem-title', fa.title));
    card.append(headRow);
    card.append(el('div', 'mem-meta', `${SITE_ICON(fa.site)} ${fa.site}${fa.date ? ` · ${fmtDate(fa.date)}` : ''}`));
    const f = fa.fields;
    if (f['Síntoma']) card.append(el('code', 'mem-symptom', f['Síntoma']));
    if (f['Causa raíz']) card.append(kv('Causa raíz', f['Causa raíz']));
    if (f['Fix aplicado']) card.append(kv('Fix aplicado', f['Fix aplicado']));
    if (f['Fix propuesto']) card.append(kv('Fix propuesto', f['Fix propuesto']));
    if (f['¿Reapareció?']) card.append(kv('¿Reapareció?', f['¿Reapareció?']));
    failRoot.append(card);
  }
  if (!data.failures.length) failRoot.append(el('p', 'mem-empty', 'Todavía no hay fallos documentados.'));

  // Changelog: línea de tiempo vertical
  const tl = $('#memory-timeline');
  tl.innerHTML = '';
  for (const ch of data.changelog) {
    const action = ch.fields['Acción'] || '';
    const item = el('div', 'tl-item');
    item.append(el('span', `tl-dot ${ACTION_CLASS[action] || ''}`));
    const body = el('div', 'tl-body');
    const meta = el('div', 'tl-meta');
    meta.append(fmtDate(ch.date) || '—');
    if (action) meta.append(el('span', `chip ${ACTION_CLASS[action] || ''}`, action.toUpperCase()));
    body.append(meta, el('div', 'tl-title', ch.title));
    const what = ch.fields['Qué'] || ch.fields['Motivo'] || '';
    if (what) body.append(el('p', 'tl-text', what.length > 220 ? `${what.slice(0, 220)}…` : what));
    item.append(body);
    tl.append(item);
  }
}

// ------------------------------------------------------------------- tabs
function switchView(view) {
  document.body.classList.toggle('view-memory', view === 'memory');
  $('#view-memory').hidden = view !== 'memory';
  document.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $('#segmented').dataset.active = view;
  if (view === 'memory') loadMemory();
}
document.querySelectorAll('.seg-btn').forEach((b) => (b.onclick = () => switchView(b.dataset.view)));

// ------------------------------------------------------------- eventos vivo
function setPill(cls, text) {
  const pill = $('#status-pill');
  pill.className = `pill ${cls}`;
  pill.textContent = text;
}

function resetLive(label) {
  liveBlocks = new Map();
  tally = { passed: 0, failed: 0 };
  $('#live-sub').textContent = label || 'Corriendo…';
  $('#live-body').innerHTML = '';
}

function liveBlockFor(feature, scenario) {
  const key = keyOf(feature, scenario);
  if (liveBlocks.has(key)) return liveBlocks.get(key);
  const block = el('div', 'run-scenario');
  block.append(el('h3', null, scenario));
  const stepsWrap = el('div', 'steps-wrap');
  block.append(stepsWrap);
  $('#live-body').append(block);
  const entry = { block, stepsWrap };
  liveBlocks.set(key, entry);
  return entry;
}

function handleEvent(ev) {
  switch (ev.type) {
    case 'diag':
      handleDiag(ev);
      break;

    case 'spawn':
      setRunning(true);
      setPill('running', 'Corriendo…');
      resetLive(ev.label);
      $('#live-panel').classList.add('running');
      break;

    case 'testStart': {
      const ref = rowByKey.get(keyOf(ev.feature, ev.scenario));
      if (ref) {
        ref.row.classList.add('active');
        ref.badge.className = 'badge running';
        ref.badge.textContent = STATUS_TEXT.running;
      }
      liveBlockFor(ev.feature, ev.scenario);
      break;
    }

    case 'stepStart': {
      const { stepsWrap } = liveBlockFor(ev.feature, ev.scenario);
      const step = el('div', 'step run');
      step.append(el('span', 'mark', '▶'));
      step.append(el('span', 'txt', ev.step));
      stepsWrap.append(step);
      $('#live-body').scrollTop = $('#live-body').scrollHeight;
      break;
    }

    case 'stepEnd': {
      const { stepsWrap } = liveBlockFor(ev.feature, ev.scenario);
      const pending = [...stepsWrap.querySelectorAll('.step.run')].pop();
      if (pending) {
        pending.className = `step ${ev.ok ? 'ok' : 'bad'}`;
        pending.querySelector('.mark').textContent = ev.ok ? '✓' : '✗';
        if (!ev.ok && ev.error) {
          const err = el('div', 'step-error', ev.error.split('\n').slice(0, 4).join('\n'));
          pending.after(err);
        }
      }
      break;
    }

    case 'testEnd': {
      const ref = rowByKey.get(keyOf(ev.feature, ev.scenario));
      if (ref) {
        ref.row.classList.remove('active');
        ref.badge.className = `badge ${ev.status}`;
        ref.badge.textContent = STATUS_TEXT[ev.status] || ev.status.toUpperCase();
        ref.meta.textContent = fmtWhen(new Date().toISOString(), ev.durationMs);
      }
      if (ev.status === 'passed') tally.passed++;
      else if (ev.status === 'failed' || ev.status === 'timedOut') tally.failed++;
      break;
    }

    case 'spawnEnd': {
      setRunning(false);
      $('#live-panel').classList.remove('running');
      const ok = tally.failed === 0;
      setPill(ok ? 'done' : 'fail', ok ? '✓ Sin fallos' : `✗ ${tally.failed} con fallos`);
      const summary = el(
        'div',
        `run-summary ${ok ? 'ok' : 'bad'}`,
        `Resultado: ${tally.passed} pasaron · ${tally.failed} fallaron`,
      );
      $('#live-body').append(summary);
      if (liveBlocks.size === 0) {
        $('#live-body').innerHTML =
          '<div class="empty"><span class="empty-emoji">🤔</span><p>No se ejecutó ningún escenario. Revisá el filtro o el reporte.</p></div>';
        $('#live-body').append(summary);
      }
      loadCatalog(); // refresca badges, fechas y las tarjetas de resumen
      break;
    }
  }
}

// ------------------------------------------------------------------ arranque
function connect() {
  const es = new EventSource('/api/stream');
  es.onmessage = (e) => handleEvent(JSON.parse(e.data));
  es.onerror = () => setTimeout(() => {}, 1000); // EventSource reintenta solo
}

$('#run-all').onclick = () => run({ mode: 'all' });
$('#open-report').onclick = () => fetch('/api/open-report', { method: 'POST' });

loadCatalog();
connect();
