// Reporter de Playwright que avisa al dashboard, en vivo, qué está pasando.
// No corre nunca solo: únicamente manda eventos si existe DASHBOARD_EVENTS_URL
// (el servidor del dashboard la define cuando lanza una corrida). En un `npm test`
// normal esta variable no existe, así que este reporter no hace nada.
import type {
  Reporter,
  TestCase,
  TestResult,
  TestStep,
  FullResult,
  Suite,
} from '@playwright/test/reporter';
import http from 'node:http';

const EVENTS_URL = process.env.DASHBOARD_EVENTS_URL;

function send(event: Record<string, unknown>): void {
  if (!EVENTS_URL) return;
  try {
    const data = Buffer.from(JSON.stringify(event));
    const url = new URL(EVENTS_URL);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
    });
    req.on('error', () => {}); // si el dashboard se cerró, no rompemos la corrida
    req.write(data);
    req.end();
  } catch {
    /* fire-and-forget */
  }
}

// El título del Feature es el `describe` que envuelve cada escenario.
function featureOf(test: TestCase): string {
  return test.parent?.title ?? '';
}

// Solo nos interesan los pasos Gherkin (Given/When/Then/And/But), que playwright-bdd
// genera como test.step. Filtramos hooks (BeforeEach/AfterEach) y lo de adentro
// (clicks, esperas, etc.): para el PO eso es ruido.
function isGherkinStep(step: TestStep): boolean {
  return step.category === 'test.step' && /^(Given|When|Then|And|But)\b/.test(step.title);
}

export default class DashboardReporter implements Reporter {
  onBegin(_config: unknown, suite: Suite): void {
    send({ type: 'runStart', total: suite.allTests().length });
  }

  onTestBegin(test: TestCase): void {
    send({ type: 'testStart', feature: featureOf(test), scenario: test.title });
  }

  onStepBegin(test: TestCase, _result: TestResult, step: TestStep): void {
    if (!isGherkinStep(step)) return;
    send({
      type: 'stepStart',
      feature: featureOf(test),
      scenario: test.title,
      step: step.title,
    });
  }

  onStepEnd(test: TestCase, _result: TestResult, step: TestStep): void {
    if (!isGherkinStep(step)) return;
    send({
      type: 'stepEnd',
      feature: featureOf(test),
      scenario: test.title,
      step: step.title,
      ok: !step.error,
      error: step.error?.message,
    });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    send({
      type: 'testEnd',
      feature: featureOf(test),
      scenario: test.title,
      status: result.status, // passed | failed | timedOut | skipped | interrupted
      durationMs: result.duration,
      error: result.error?.message,
    });
  }

  onEnd(result: FullResult): void {
    send({ type: 'runEnd', status: result.status });
  }
}
