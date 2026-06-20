// Dashboard local de pruebas. Node puro, sin dependencias.
//   node dashboard/server.js   ->   abrí http://localhost:4321
//
// Qué hace:
//  - Lee tus .feature y arma la lista de pruebas agrupadas por sitio.
//  - Guarda el resultado de la última corrida de cada escenario.
//  - Lanza Playwright cuando le das "Correr" y transmite los pasos en vivo (SSE).
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn, spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const FEATURES_DIR = path.join(ROOT, 'features');
const PUBLIC_DIR = path.join(__dirname, 'public');
const RESULTS_FILE = path.join(__dirname, 'last-results.json');
const PORT = process.env.DASHBOARD_PORT ? Number(process.env.DASHBOARD_PORT) : 4321;

// ---------------------------------------------------------------- resultados
function loadResults() {
  try {
    return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  } catch {
    return {};
  }
}
function saveResults(results) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}
const keyOf = (feature, scenario) => `${feature} :: ${scenario}`;

// --------------------------------------------------------- parseo de features
// Recorre features/ y devuelve: [{ site, file, feature, scenarios: [{name, steps}] }]
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.feature')) out.push(full);
  }
  return out;
}

function parseFeature(file) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(FEATURES_DIR, file);
  const site = rel.split(path.sep)[0];
  let feature = path.basename(file, '.feature');
  const scenarios = [];
  let current = null;

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('Feature:')) {
      feature = line.slice('Feature:'.length).trim();
    } else if (line.startsWith('Scenario Outline:') || line.startsWith('Scenario:')) {
      const name = line.replace(/^Scenario( Outline)?:/, '').trim();
      current = { name, steps: [] };
      scenarios.push(current);
    } else if (current && /^(Given|When|Then|And|But)\b/.test(line)) {
      current.steps.push(line);
    }
  }
  return { site, file: rel, feature, scenarios };
}

function buildCatalog() {
  const results = loadResults();
  const features = walk(FEATURES_DIR).map(parseFeature);
  const sitesMap = new Map();

  for (const f of features) {
    if (!sitesMap.has(f.site)) sitesMap.set(f.site, []);
    sitesMap.get(f.site).push({
      feature: f.feature,
      file: f.file,
      scenarios: f.scenarios.map((s) => ({
        name: s.name,
        steps: s.steps,
        last: results[keyOf(f.feature, s.name)] || null,
      })),
    });
  }

  return [...sitesMap.entries()].map(([site, feats]) => ({ site, features: feats }));
}

// ------------------------------------------------------------------ corridas
const clients = new Set(); // conexiones SSE abiertas
let activeRun = null; // { proc } cuando hay una corrida en curso

function broadcast(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) res.write(payload);
}

// Escapa metacaracteres de regex para el --grep de Playwright.
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function startRun(body) {
  if (activeRun) return { ok: false, error: 'Ya hay una corrida en curso.' };
  if (activeAI) return { ok: false, error: 'Hay un diagnóstico con IA en curso. Esperá a que termine.' };

  // Los argumentos van como ARREGLO (sin shell): así un nombre con espacios queda
  // como un solo argumento y --grep aísla bien un escenario.
  // --workers=1: en el dashboard corremos de a uno, para verlo en orden y claro.
  // El filtro posicional <site> = subcadena en la ruta del spec
  // (.features-gen/<site>/...): adidas corre headed y saucedemo en chromium, sin mapear nada.
  const pwArgs = ['playwright', 'test', '--workers=1'];
  let label = 'Todas las pruebas';

  if (body.mode === 'site' && body.site) {
    pwArgs.push(body.site);
    label = `Sitio: ${body.site}`;
  } else if (body.mode === 'scenario' && body.scenario) {
    if (body.site) pwArgs.push(body.site);
    pwArgs.push('--grep', escapeRegex(body.scenario));
    label = body.scenario;
  }

  const env = { ...process.env, DASHBOARD_EVENTS_URL: `http://127.0.0.1:${PORT}/api/ingest`, FORCE_COLOR: '0' };
  const relay = (chunk) => broadcast({ type: 'log', line: chunk.toString() });
  activeRun = {};

  broadcast({ type: 'spawn', label, command: `npx bddgen && npx ${pwArgs.join(' ')}` });

  // 1) Regenerar los specs desde los .feature, 2) correr Playwright.
  const bdd = spawn('npx', ['bddgen'], { cwd: ROOT, env });
  bdd.stdout.on('data', relay);
  bdd.stderr.on('data', relay);
  bdd.on('close', (code) => {
    if (code !== 0) {
      activeRun = null;
      return broadcast({ type: 'spawnEnd', code });
    }
    const pw = spawn('npx', pwArgs, { cwd: ROOT, env });
    activeRun.proc = pw;
    pw.stdout.on('data', relay);
    pw.stderr.on('data', relay);
    pw.on('close', (pwCode) => {
      activeRun = null;
      broadcast({ type: 'spawnEnd', code: pwCode });
    });
  });

  return { ok: true };
}

// ------------------------------------------------------ eventos del reporter
function ingest(event) {
  if (event.type === 'testEnd') {
    const results = loadResults();
    results[keyOf(event.feature, event.scenario)] = {
      status: event.status,
      at: new Date().toISOString(),
      durationMs: event.durationMs,
      error: event.error || null,
    };
    saveResults(results);
  }
  broadcast(event); // todo evento del reporter va directo a la UI
}

// ------------------------------------------------------- diagnóstico con IA
// Botón "¿Por qué falló?": lanza Claude Code en modo headless (-p) para que
// investigue el fallo igual que el flujo /analyze-failure y lo registre en
// memory.md. Solo puede LEER el repo; lo único que puede escribir es memory.md.
let activeAI = null; // { proc, key, timer } cuando hay un diagnóstico en curso

function findClaudeBin() {
  // 1) el comando instalado en el PATH
  const which = spawnSync('which', ['claude']);
  if (which.status === 0) return which.stdout.toString().trim();
  // 2) el binario que trae la extensión de VS Code (la versión más nueva)
  try {
    const extDir = path.join(os.homedir(), '.vscode', 'extensions');
    const candidates = fs
      .readdirSync(extDir)
      .filter((d) => d.startsWith('anthropic.claude-code-'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((d) => path.join(extDir, d, 'resources', 'native-binary', 'claude'))
      .filter((p) => fs.existsSync(p));
    return candidates.pop() || null;
  } catch {
    return null;
  }
}

function diagnosisPrompt(feature, scenario, last) {
  return [
    'Sos el QA automation expert de este repo. Una prueba FALLÓ y tenés que diagnosticarla siguiendo tu flujo /analyze-failure.',
    '',
    `Feature: ${feature}`,
    `Escenario: ${scenario}`,
    `Estado: ${last.status} · Duración: ${Math.round((last.durationMs || 0) / 1000)}s · Fecha: ${last.at}`,
    'Error guardado:',
    '```',
    (last.error || 'sin mensaje de error').slice(0, 3000),
    '```',
    '',
    'Tu tarea:',
    '1. Leé el .feature, los steps y los Page Objects involucrados (features/, steps/, pages/).',
    '2. Revisá memory.md por si ya pasó algo parecido (Historial de fallos y Problemas conocidos).',
    '3. Clasificá el fallo en UNO de estos tipos: "locator roto", "timing", "lógica" o "ambiente".',
    '4. NO modifiques ningún archivo de tests ni pages. El fix solo lo proponés.',
    '5. Registrá el fallo en memory.md (sección "Historial de fallos", bajo el sitio que corresponda, con el formato documentado al final de ese archivo). Si es repetición de un fallo ya documentado, actualizá la entrada existente en vez de duplicarla.',
    '6. Tu ÚLTIMO mensaje debe ser SOLO un bloque de código JSON con esta forma exacta, escrito en español simple para alguien no técnico:',
    '```json',
    '{"tipo": "timing", "explicacion": "qué pasó, en 2 a 4 frases claras", "fix": "el cambio concreto propuesto, listo para aplicar", "archivos": ["ruta/del/archivo.ts"]}',
    '```',
  ].join('\n');
}

// Saca el JSON del mensaje final del agente (viene en un bloque ```json).
function extractJson(text = '') {
  const fence = text.match(/```json\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function startDiagnose(body) {
  if (activeRun) return { ok: false, error: 'Hay una corrida en curso. Esperá a que termine.' };
  if (activeAI) return { ok: false, error: 'Ya hay un diagnóstico en curso.' };

  const { feature, scenario } = body;
  if (!feature || !scenario) return { ok: false, error: 'Faltan datos del escenario.' };
  const key = keyOf(feature, scenario);
  const last = loadResults()[key];
  if (!last || last.status === 'passed') {
    return { ok: false, error: 'Este escenario no tiene un fallo guardado para analizar.' };
  }

  const bin = findClaudeBin();
  if (!bin) {
    return { ok: false, error: 'No encontré Claude Code en esta computadora (ni en el PATH ni en la extensión de VS Code).' };
  }

  const args = [
    '-p', diagnosisPrompt(feature, scenario, last),
    '--output-format', 'stream-json', '--verbose',
    '--model', 'sonnet',
    '--max-turns', '30',
    '--allowedTools', 'Read Glob Grep Edit(memory.md) Write(memory.md)',
  ];
  const proc = spawn(bin, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });

  let maxPct = 5;
  let finished = false;
  let errTail = '';

  const send = (kind, extra) => broadcast({ type: 'diag', kind, key, feature, scenario, ...extra });
  const progress = (pct, label) => {
    maxPct = Math.max(maxPct, pct); // la barra solo avanza, nunca retrocede
    send('activity', { pct: maxPct, label });
  };
  const finish = (kind, extra) => {
    if (finished) return;
    finished = true;
    if (activeAI) clearTimeout(activeAI.timer);
    activeAI = null;
    send(kind, extra);
  };

  // Cada herramienta que usa el agente se traduce a una etapa entendible + avance.
  const onToolUse = (name, input = {}) => {
    const file = input.file_path || input.path || '';
    const base = path.basename(file);
    if ((name === 'Edit' || name === 'Write') && base === 'memory.md')
      return progress(85, 'Guardando el diagnóstico en memory.md');
    if (name === 'Read' && base === 'memory.md') return progress(60, 'Revisando la memoria por fallos parecidos');
    if (name === 'Read' && file.endsWith('.feature')) return progress(20, `Leyendo el escenario (${base})`);
    if (name === 'Read' && /\/(pages|steps)\//.test(file))
      return progress(45, `Revisando el código de la prueba (${base})`);
    if (name === 'Read') return progress(30, `Leyendo ${base || 'archivos del proyecto'}`);
    if (name === 'Glob' || name === 'Grep') return progress(25, 'Buscando en el código del proyecto');
  };

  let buf = '';
  proc.stdout.on('data', (chunk) => {
    buf += chunk.toString();
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let ev;
      try {
        ev = JSON.parse(line);
      } catch {
        continue;
      }
      if (ev.type === 'assistant') {
        for (const block of ev.message?.content || []) {
          if (block.type === 'tool_use') onToolUse(block.name, block.input);
        }
      } else if (ev.type === 'result') {
        const result = ev.subtype === 'success' ? extractJson(ev.result) : null;
        if (result) finish('done', { pct: 100, result });
        else if (ev.subtype === 'success') finish('done', { pct: 100, result: { explicacion: (ev.result || '').slice(0, 800) } });
        else finish('fail', { error: 'El diagnóstico terminó con error.' });
      }
    }
  });
  proc.stderr.on('data', (c) => {
    errTail = (errTail + c.toString()).slice(-400);
  });
  proc.on('close', () => finish('fail', { error: `El diagnóstico se cortó antes de terminar. ${errTail}`.trim() }));
  proc.on('error', (err) => finish('fail', { error: `No pude lanzar Claude Code: ${err.message}` }));

  const timer = setTimeout(() => {
    try {
      proc.kill('SIGKILL');
    } catch {}
  }, 5 * 60 * 1000);
  activeAI = { proc, key, timer };
  send('start', { pct: 5, label: 'Arrancando el análisis…' });
  return { ok: true };
}

// ----------------------------------------------------- memoria del proyecto
// Convierte memory.md en datos para la pestaña "Memoria": problemas conocidos,
// historial de fallos y changelog. El formato está documentado en el propio archivo.
function parseMemory() {
  let text;
  try {
    text = fs.readFileSync(path.join(ROOT, 'memory.md'), 'utf8');
  } catch {
    return { failures: [], issues: [], changelog: [] };
  }

  const failures = [];
  const issues = [];
  const changelog = [];
  let section = ''; // 'fallos' | 'problemas' | 'changelog'
  let site = '';
  let group = '';
  let entry = null;

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();

    if (line.startsWith('## ')) {
      const h = line.slice(3).toLowerCase();
      section = h.startsWith('historial') ? 'fallos' : h.startsWith('problemas') ? 'problemas' : h.startsWith('changelog') ? 'changelog' : '';
      site = '';
      group = '';
      entry = null;
      continue;
    }
    if (!section) continue;

    if (line.startsWith('### ')) {
      const title = line.slice(4).trim();
      entry = null;
      if (section === 'changelog') {
        const m = title.match(/^(\d{4}-\d{2}-\d{2})\s*—\s*(.+)$/);
        entry = { date: m ? m[1] : '', title: m ? m[2] : title, fields: {} };
        changelog.push(entry);
      } else {
        site = title;
        group = '';
      }
      continue;
    }

    if (line.startsWith('#### ')) {
      const title = line.slice(5).trim();
      entry = null;
      // Subtítulos de agrupación, no entradas
      if (/^(activos|resueltos|fallos resueltos|fallos recurrentes)$/i.test(title)) {
        group = title;
        continue;
      }
      const m = title.match(/^(\d{4}-\d{2}-\d{2})\s*—\s*(.+)$/);
      entry = { site, group, date: m ? m[1] : '', title: m ? m[2] : title, fields: {} };
      (section === 'fallos' ? failures : issues).push(entry);
      continue;
    }

    const field = line.match(/^- \*\*(.+?):?\*\*:?\s*(.*)$/);
    if (field && entry) entry.fields[field[1].replace(/:$/, '')] = field[2];
  }

  for (const it of issues) {
    const estado = `${it.fields['Estado'] || ''} ${it.group}`;
    it.status = /resuelt/i.test(estado) ? 'resuelto' : 'activo';
  }
  for (const f of failures) f.tipo = (f.fields['Tipo'] || '').toLowerCase();

  return { failures, issues, changelog };
}

// --------------------------------------------------------------- utilidades
function sendJson(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
function serveStatic(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('No encontrado');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

// ------------------------------------------------------------------ servidor
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/tests') return sendJson(res, 200, { sites: buildCatalog() });

  if (url.pathname === '/api/status') return sendJson(res, 200, { running: !!activeRun, diagnosing: !!activeAI });

  if (url.pathname === '/api/run' && req.method === 'POST') {
    const result = startRun(await readBody(req));
    return sendJson(res, result.ok ? 200 : 409, result);
  }

  if (url.pathname === '/api/diagnose' && req.method === 'POST') {
    const result = startDiagnose(await readBody(req));
    return sendJson(res, result.ok ? 200 : 409, result);
  }

  if (url.pathname === '/api/memory') return sendJson(res, 200, parseMemory());

  if (url.pathname === '/api/ingest' && req.method === 'POST') {
    ingest(await readBody(req));
    res.writeHead(204);
    return res.end();
  }

  if (url.pathname === '/api/open-report' && req.method === 'POST') {
    // show-report queda vivo después del primer clic ocupando el puerto 9323;
    // lanzar otro fallaría en silencio. Si ya está servido, solo abrimos el navegador.
    const REPORT_URL = 'http://localhost:9323';
    http
      .get(REPORT_URL, (r) => {
        r.resume();
        spawn('open', [REPORT_URL], { detached: true, stdio: 'ignore' }).unref();
      })
      .on('error', () => {
        spawn('npx', ['playwright', 'show-report'], { cwd: ROOT, shell: true, detached: true, stdio: 'ignore' }).unref();
      });
    res.writeHead(204);
    return res.end();
  }

  if (url.pathname === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  // estáticos
  const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  return serveStatic(res, path.join(PUBLIC_DIR, file));
});

server.listen(PORT, () => {
  console.log(`\n  🚦 Dashboard de pruebas corriendo en  http://localhost:${PORT}\n`);
});
