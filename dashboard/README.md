# Tablero de Pruebas Automatizadas

Una página web local para ver, correr y mirar las pruebas en vivo — **sin tocar código ni la terminal**. Pensada para que un Product Owner o un dev puedan usarla.

## Cómo abrirlo

```bash
npm run dashboard
```

Después abrí en el navegador: **http://localhost:4321**

## Qué se ve

### Pestaña "Pruebas"

- **Todas las pruebas** agrupadas por sitio (Sauce Demo, adidas…), con sus pasos.
- El **resultado de la última corrida** de cada prueba (🟢 PASÓ / 🔴 FALLÓ) y cuándo fue.
- Botones para **Correr** todo, un sitio entero o una sola prueba.
- Un panel **"En vivo"** donde los pasos (Given/When/Then) se van marcando ✓/✗ mientras la prueba corre.
- Botón **"Ver último reporte"** para abrir el reporte HTML de Playwright (con trace, video y screenshots del detalle).
- En toda prueba roja, un botón **"✦ ¿Por qué falló?"**: lanza a Claude Code por detrás (modo headless) para que investigue el fallo como lo haría el coworker con `/analyze-failure` — lee el error, revisa el código del test y la memoria, clasifica el fallo (locator roto / timing / lógica / ambiente), te lo explica en lenguaje claro con un fix propuesto y lo deja registrado en `memory.md`. Mientras analiza ves su avance en vivo con una barrita de progreso.

> ⚠️ Cada diagnóstico **consume del plan de Claude** (usa el modelo Sonnet para mantenerlo barato; estimá ~$0.2–0.8 por diagnóstico o su equivalente en uso del plan).

### Pestaña "Memoria"

La memoria del proyecto (`memory.md`) renderizada bonita, para leerla sin abrir el editor:

- **Problemas conocidos de las páginas** con chip de estado (Activo/Resuelto) — ej. "adidas bloquea headless".
- **Historial de fallos** con el tipo de cada uno, su causa raíz y el fix aplicado.
- **Changelog de la suite** como línea de tiempo.

## Cómo funciona por detrás (para devs)

| Pieza | Qué hace |
|---|---|
| `server.js` | Servidor Node (sin dependencias). Lee los `.feature`, guarda resultados, lanza Playwright y transmite eventos por SSE. |
| `reporter.ts` | Reporter de Playwright que manda cada paso al servidor en vivo. Solo se activa cuando la corrida viene del tablero (`DASHBOARD_EVENTS_URL`). |
| `public/` | La interfaz: `index.html`, `app.js`, `styles.css`. |
| `last-results.json` | Última ejecución de cada escenario (se crea solo, está en `.gitignore`). |

Para el botón "¿Por qué falló?", el server busca el CLI de Claude Code (primero en el PATH, si no en el binario de la extensión de VS Code) y lo lanza con `-p --output-format stream-json` y permisos de **solo lectura** del repo — lo único que puede escribir es `memory.md`. El fix nunca se aplica solo: se propone. Hay un solo trabajo de IA a la vez, y mientras corre no se pueden lanzar pruebas (ni al revés).

Las corridas usan `--workers=1` para verse de a una y en orden. adidas corre con navegador visible (headed) porque el sitio bloquea headless — así que al correrla vas a ver el navegador real en acción.

> El `npm test` de siempre no cambia: el reporter del dashboard solo se suma cuando la corrida sale de este tablero.
