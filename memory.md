# Memoria del QA Coworker

Conocimiento acumulado del proyecto. Se actualiza al diagnosticar fallos, detectar problemas en páginas y agregar o modificar tests.

---

## Historial de fallos

Tests que fallaron, cómo se diagnosticaron y cómo se resolvieron. Antes de investigar un fallo nuevo, revisar aquí si ya ocurrió algo similar.

### Sauce Demo

#### Fallos resueltos

#### 2026-06-10 — Timeouts intermitentes de navegación (varios escenarios)

- **Sitio:** saucedemo (y también afectó adidasmx)
- **Tipo:** timing + ambiente
- **Síntoma:** `page.goto: Test timeout of 30000ms exceeded` y `page.waitForLoadState: Test timeout of 30000ms exceeded` — cada corrida fallaba un test distinto, nunca el mismo.
- **Causa raíz:** Doble. (1) Ambiente: saucedemo.com tuvo un día lento (curl midió 16.5s de respuesta vs <1s normal). (2) Código frágil: `goto` esperaba el evento "load" (todos los recursos) y `waitForLoad()` usaba `networkidle` (500ms sin tráfico de red), patrón que la documentación de Playwright desaconseja. Con red lenta ninguno de los dos llega antes del timeout aunque la página ya esté usable.
- **Fix aplicado:** `goto` y `waitForLoadState` ahora usan `domcontentloaded`; la espera fina la hacen los `expect()` de elementos, que tienen retry automático.
- **Archivos:** `pages/shared/BasePage.ts`, `pages/adidasmx/HomePage.ts`
- **¿Reapareció?** No (verificado: 5/5 adidas + 6/6 saucedemo tras el fix; un test necesitó retry por la lentitud del sitio ese día)

#### Fallos recurrentes

_(patrones que fallaron más de una vez)_

---

## Problemas conocidos de las páginas

Elementos inestables, bugs del sitio y selectores que hay que vigilar. Revisar antes de agregar selectores nuevos en `/setup-page`.

### adidas México (adidas.mx)

#### Activos

#### Bloqueo anti-bots en modo headless — todo el sitio

- **Detectado:** 2026-06-10
- **Problema:** adidas.mx (protección Akamai) responde HTTP 403 con página "Unfortunately we are unable to give you access" a navegadores headless. En modo headed la página carga normal.
- **Impacto:** Todos los tests de adidasmx — nunca van a pasar en headless ni en CI sin display.
- **Workaround:** Proyecto `adidas-headed` en `playwright.config.ts` con `headless: false` y `testMatch: /adidasmx/`. El proyecto `chromium` ignora adidasmx.
- **Estado:** Activo — es comportamiento permanente del sitio, no un bug nuestro

#### La búsqueda navega a URLs distintas según el término

- **Detectado:** 2026-06-10
- **Problema:** Buscar "running" redirige a `/running?grid=true` (categoría), "ultraboost" a `/ultraboost` (landing de marca), términos libres a `/search?q=`. No hay patrón de URL único.
- **Impacto:** Tests de búsqueda
- **Workaround:** `SearchResultsPage.waitForResults()` espera que `url.pathname !== '/'` en vez de un patrón fijo.
- **Estado:** Activo — comportamiento por diseño del sitio

#### El botón de cuenta del header no navega

- **Detectado:** 2026-06-10
- **Problema:** El botón "Regístrate o inicia sesión en adiClub" del header abre un menú flotante sin cambiar la URL. Para llegar al login se usa el enlace de la home "Regístrate o inicia sesión para desbloquear tu experiencia personalizada" → `/account-login`, que es contenido personalizado y podría desaparecer si cambia la campaña de la home.
- **Impacto:** Escenario "Acceder al formulario de inicio de sesión"
- **Workaround:** `HomePage.goToLogin()` usa ese enlace. Si desaparece, evaluar navegar directo a `/account-login`.
- **Estado:** Activo — selector a vigilar

#### Resueltos

#### selector: data-auto-id en adidas.mx — pendiente de verificación

- **Detectado:** 2026-06-10 / **Resuelto:** 2026-06-10
- **Problema:** Los selectores `data-auto-id` iniciales se crearon sin inspección en vivo y ninguno existía en la página real.
- **Fix:** Reemplazados por locators por rol verificados con el snapshot de accesibilidad de Playwright: botón "Aceptar el seguimiento" (cookies), link "tienda online" (logo), textbox "Buscar", lista "Main Navigation", links de producto `main a[href*=".html"]`, heading nivel 1 (nombre en PDP).
- **Estado:** Resuelto

---

### Sauce Demo (saucedemo.com)

#### Activos

#### Lentitud intermitente del sitio — todo el sitio

- **Detectado:** 2026-06-10
- **Problema:** saucedemo.com tiene períodos donde la primera respuesta tarda 15s+ (medido con curl). Es un sitio de práctica gratuito, no hay SLA.
- **Impacto:** Cualquier test puede dar timeout en `goto` durante esos períodos; el test que falla cambia en cada corrida.
- **Workaround:** Esperas cambiadas a `domcontentloaded`. Si igual falla con timeout de navegación y el fallo no se repite en el mismo test, es el sitio: reintentar más tarde antes de tocar código.
- **Estado:** Activo — comportamiento del sitio, fuera de nuestro control

#### Resueltos

_(sin entradas aún)_

---

## Changelog de la suite

Qué se agregó, modificó o eliminó. Lo más reciente arriba.

### 2026-06-10 — Dashboard: botón "¿Por qué falló?" con IA y pestaña "Memoria"

- **Acción:** Agregado
- **Qué:** `dashboard/server.js` — endpoints `/api/diagnose` (lanza Claude Code headless con modelo Sonnet para diagnosticar un fallo como `/analyze-failure`: solo lectura del repo + escritura únicamente en `memory.md`, un trabajo de IA a la vez, timeout 5 min) y `/api/memory` (parsea este archivo a JSON). `dashboard/public/` — control segmentado Pruebas|Memoria estilo Apple, tarjeta de diagnóstico inline con barra de progreso y feed de actividad en vivo, pestaña Memoria con problemas conocidos (chips Activo/Resuelto), historial de fallos y changelog como línea de tiempo.
- **Motivo:** Que cualquiera pueda entender por qué falló una prueba (la IA lo explica en lenguaje QA y lo registra acá) y leer la memoria del proyecto sin abrir el editor. Verificado end-to-end con un diagnóstico real: clasificó bien un timeout como "ambiente", propuso fix sin aplicarlo y actualizó este archivo con el formato correcto.
- **Notas técnicas:** El server encuentra el CLI de Claude Code en el PATH o dentro de la extensión de VS Code (`findClaudeBin`). Cada diagnóstico consume del plan de Claude (~$0.2–0.8 con Sonnet). El fix nunca se aplica solo.

### 2026-06-10 — Rediseño del dashboard con estética Apple

- **Acción:** Modificado
- **Qué:** `dashboard/public/` (index.html, styles.css, app.js) — rediseño visual completo: fondo gris perla `#f5f5f7`, header de vidrio esmerilado (backdrop-filter), tarjetas blancas redondeadas con sombras suaves, botones píldora azul Apple `#0071e3`, tarjetas de resumen (escenarios/sitios/pasando/fallando), panel "En vivo" oscuro con barra de progreso degradada animada mientras corre, pasos desplegables con animación. Al terminar una corrida el catálogo y las tarjetas se refrescan solos.
- **Motivo:** El usuario pidió acercar la interfaz al estilo de las páginas de Apple: simple, interactiva y futurista. Solo cambió la capa visual; servidor y reporter no se tocaron. Verificado con screenshots reales vía Playwright (vista inicial, corrida en vivo y resultado final).

### 2026-06-10 — Dashboard web para correr pruebas sin tocar código

- **Acción:** Agregado
- **Qué:** Carpeta `dashboard/` (Node puro, sin dependencias nuevas): `server.js` (API + SSE + lanza Playwright), `reporter.ts` (reporter de Playwright que transmite cada paso Gherkin en vivo), `public/` (UI en español). Cambios menores: `playwright.config.ts` suma el reporter del dashboard solo cuando corre desde el tablero (variable `DASHBOARD_EVENTS_URL`); `package.json` script `npm run dashboard`; `.gitignore` ignora `dashboard/last-results.json`.
- **Motivo:** Que un PO o dev pueda ver las pruebas, correrlas con un botón y mirar cómo pasan/fallan en vivo, sin entrar al código ni la terminal. Corre local en `http://localhost:4321`.
- **Notas técnicas:** Los argumentos a Playwright van como arreglo (sin shell) para que `--grep` aísle bien un escenario con espacios; el reporter filtra hooks y muestra solo Given/When/Then; las corridas del dashboard usan `--workers=1` para verse en orden. El filtro por sitio usa la subcadena de ruta (`saucedemo`/`adidasmx`), así adidas corre headed y saucedemo headless sin mapear proyectos. Un `npm test` normal no cambia en nada.

### 2026-06-10 — Árbol del Test Explorer acortado

- **Acción:** Modificado
- **Qué:** `playwright.config.ts` — agregado `featuresRoot: 'features'` en `defineBddConfig`. Los specs generados pasan de `.features-gen/features/[sitio]/...` a `.features-gen/[sitio]/...`.
- **Motivo:** El usuario tenía que destapar demasiados niveles en el Test Explorer de VS Code para llegar a un test. Solo cambia dónde se generan los archivos; la lógica de los tests no se tocó (verificado con `playwright test --list`: 11 tests en 4 archivos, cada proyecto toma los suyos).

### 2026-06-10 — Cierre de navegador al terminar cada escenario + esperas robustas

- **Acción:** Modificado
- **Qué:** `hooks/hooks.ts` — hook `After` que cierra la página al terminar cada escenario que pasó (si falló, queda abierta para la screenshot del fallo). `pages/shared/BasePage.ts` y `pages/adidasmx/HomePage.ts` — esperas de navegación cambiadas de "load"/"networkidle" a `domcontentloaded`.
- **Motivo:** El usuario pidió que los navegadores se cierren al terminar las pruebas. Las esperas se endurecieron tras diagnosticar timeouts intermitentes (ver Historial de fallos). Verificado: 5/5 adidas + 6/6 saucedemo.

### 2026-06-10 — Suite adidas México verificada y en verde (5/5)

- **Acción:** Modificado
- **Qué:** Page Objects de adidasmx reescritos con locators por rol verificados; `playwright.config.ts` ahora tiene dos proyectos (`chromium` para saucedemo headless, `adidas-headed` para adidasmx con navegador visible); escenario de cuenta renombrado a "Acceder al formulario de inicio de sesión" usando el enlace de la home.
- **Motivo:** Primera corrida real reveló que ningún selector inicial existía, que el sitio bloquea headless con 403 y que la búsqueda redirige a URLs variables. Resultado final: 5/5 adidas + 6/6 saucedemo pasando.

### 2026-06-10 — Suite adidas México creada

- **Acción:** Agregado
- **Qué:** `pages/adidasmx/HomePage.ts`, `SearchResultsPage.ts`, `ProductDetailPage.ts`; `features/adidasmx/navegacion.feature` (3 escenarios), `busqueda.feature` (2 escenarios); `steps/adidasmx/navegacion.steps.ts`, `busqueda.steps.ts`; `fixtures/index.ts` actualizado con las 3 nuevas pages
- **Motivo:** Primera cobertura de adidas.mx — smoke test, búsqueda, navegación a categoría, detalle de producto y acceso a cuenta
- **Nota:** Selectores basados en el patrón data-auto-id de la plataforma Adidas. Verificar en primera corrida real. Ver "Problemas conocidos de las páginas".

### 2026-06-09 — Estado inicial documentado

- **Suite actual:** Login + Inventory cubiertos en Sauce Demo
- **Archivos:** `pages/saucedemo/LoginPage.ts`, `InventoryPage.ts`, `BasePage.ts`
- **Features:** `features/saucedemo/login.feature`, `inventory.feature`
- **Steps:** `steps/saucedemo/login.steps.ts`, `inventory.steps.ts`

---

## Cómo usar este archivo

**El coworker lee este archivo automáticamente** antes de ejecutar `/analyze-failure`, `/setup-page` y `/audit-tests`.

**Se actualiza automáticamente** al terminar esas skills. También podés pedirle al coworker que guarde algo manualmente diciendo "guardá esto en memory.md".

### Formato para agregar un fallo

```
#### [YYYY-MM-DD] — [Nombre del escenario Gherkin]

- **Sitio:** saucedemo / otro
- **Tipo:** locator roto | timing | lógica | ambiente | obsoleto
- **Síntoma:** [mensaje de error clave]
- **Causa raíz:** [qué cambió exactamente]
- **Fix aplicado:** [qué se modificó]
- **Archivos:** [lista]
- **¿Reapareció?** No
```

### Formato para agregar un problema de página

```
#### [elemento] — [página]

- **Detectado:** [YYYY-MM-DD]
- **Problema:** [descripción]
- **Impacto:** [qué tests afecta]
- **Workaround:** [cómo se maneja]
- **Estado:** Activo | Resuelto
```

### Formato para el changelog

```
### [YYYY-MM-DD] — [descripción breve]

- **Acción:** Agregado | Modificado | Eliminado
- **Qué:** [archivos o escenarios]
- **Motivo:** [por qué]
```
