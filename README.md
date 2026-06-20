# Playwright + Cucumber — Repositorio de pruebas automatizadas

Repositorio de pruebas automatizadas usando **Playwright**, **TypeScript** y **Cucumber/BDD**. Los escenarios están escritos en español para que cualquier persona del equipo pueda leerlos, no solo quienes saben programar.

## ¿Qué necesitás tener instalado antes de empezar?

| Herramienta | Versión mínima | Cómo verificar que la tenés |
|---|---|---|
| [Node.js](https://nodejs.org) | 18 o superior | `node --version` |
| [Git](https://git-scm.com) | cualquiera | `git --version` |
| VS Code o Cursor | cualquiera | — |

---

## Instalación paso a paso

### 1. Clonar el repositorio

```bash
git clone <URL-del-repositorio>
cd playwright-claudecode
```

### 2. Instalar las dependencias

```bash
npm install
```

Esto descarga Playwright, TypeScript, Cucumber y todo lo necesario.

### 3. Instalar el navegador

```bash
npx playwright install chromium
```

Playwright usa su propio Chromium, por eso hay que instalarlo por separado.

---

## Correr los tests

```bash
npm test
```

Corre todos los escenarios en modo headless (sin abrir el navegador visualmente). Al terminar muestra un resumen en la terminal.

### Ver el navegador mientras corre

```bash
npm run test:headed
```

Útil cuando querés ver exactamente qué está haciendo el test.

### Ver el reporte HTML con los resultados

```bash
npm run test:report
```

Abre un reporte visual en el navegador con cada escenario, los pasos que ejecutó y capturas de pantalla si algo falló.

---

## Estructura del proyecto

```
features/[sitio]/    → Escenarios en Gherkin (Given/When/Then) — se leen como prosa
pages/[sitio]/       → Page Objects — saben cómo interactuar con cada página
steps/[sitio]/       → Código que conecta los pasos Gherkin con los Page Objects
hooks/               → Setup que corre antes/después de cada escenario
fixtures/            → Hace disponibles los Page Objects para todos los steps
```

Cada sitio web que se agrega tiene su propia subcarpeta. Los tests de Sauce Demo viven en `features/saucedemo/`, `pages/saucedemo/` y `steps/saucedemo/`.

---

## Tests incluidos

### Sauce Demo (`saucedemo.com`)

**Login** — `features/saucedemo/login.feature`
- Login exitoso con usuario estándar
- Login con contraseña incorrecta
- Login con usuario bloqueado

**Inventario** — `features/saucedemo/inventory.feature`
- Ver la lista de productos
- Agregar un producto al carrito
- Agregar dos productos al carrito

---

## Coworker IA integrado

Este repositorio tiene un asistente de QA configurado en Claude Code que sabe del proyecto y puede:

- **`/setup-page [URL]`** — Analiza una página nueva, propone qué automatizar y crea el Page Object, el `.feature` y los steps. Si la página ya tiene tests, detecta qué cobertura falta y agrega los casos nuevos.
- **`/analyze-failure`** — Cuando un test falla, pegás el output y el asistente explica qué pasó y da el fix listo para aplicar.

Para usarlo necesitás tener **Claude Code** instalado.

---

## Credenciales de Sauce Demo

Son credenciales públicas de práctica:

| Usuario | Contraseña | Comportamiento |
|---|---|---|
| `standard_user` | `secret_sauce` | Login normal |
| `locked_out_user` | `secret_sauce` | Bloqueado — no puede entrar |
