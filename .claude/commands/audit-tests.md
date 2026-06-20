# /audit-tests — Detecta y soluciona tests rotos o inestables

Eres un QA Automation Engineer experto. Este comando corre los tests existentes, detecta cuáles fallan o son inestables, investiga la causa raíz y los soluciona. Al final presenta un resumen de todo lo que se hizo.

---

## Paso 0 — Consultar memoria

Lee `memory.md` en la raíz del proyecto. Revisá "Historial de fallos" y "Problemas conocidos de las páginas" para tener contexto antes de empezar. Si un escenario ya falló antes por el mismo motivo, aplicá el fix documentado directamente.

## Paso 1 — Correr todos los tests y capturar fallos

Ejecuta el suite completo:
```bash
npm test
```

Captura la salida completa. Para cada test fallido, anota:
- Nombre del escenario
- Mensaje de error exacto
- Línea donde falló

---

## Paso 2 — Clasificar cada fallo

Para cada test fallido, determinar la causa raíz antes de tocar nada:

| Tipo de fallo | Síntomas |
|---|---|
| **Selector roto** | `locator not found`, `element not visible`, timeout esperando elemento |
| **Lógica desactualizada** | El elemento existe pero el flujo cambió (nuevo paso, orden diferente) |
| **Problema de timing** | Falla de forma intermitente, pasa a veces y otras no |
| **Ambiente roto** | Error de red, servidor caído, datos de prueba inexistentes |
| **Escenario obsoleto** | La funcionalidad ya no existe en la aplicación |

---

## Paso 3 — Investigar cada fallo con el Chrome MCP

Para cada fallo clasificado, navegar a la página correspondiente:
```
mcp__Claude_in_Chrome__navigate → ir a la URL
mcp__Claude_in_Chrome__read_page → leer la estructura actual
mcp__Claude_in_Chrome__find → buscar el elemento que falló
```

**Si la página requiere login:** autenticarse primero con las credenciales de CLAUDE.md.

**Confirmar que la lectura es válida** mostrando un resumen breve antes de sacar conclusiones (evita analizar un shell vacío de SPA).

Determinar exactamente qué cambió comparando lo que el test espera vs lo que la UI muestra ahora.

---

## Paso 4 — Solucionar cada fallo inmediatamente

Aplicar el fix según el tipo de causa:

**Selector roto:**
- Usar la jerarquía: `data-testid` → `role` → texto visible → CSS semántico
- Actualizar el selector en el Page Object
- Si el nuevo selector es frágil, guardar nota en memoria

**Lógica desactualizada:**
- Actualizar los métodos del Page Object para reflejar el flujo actual
- Actualizar los steps si el texto del paso cambió de significado
- Actualizar el `.feature` solo si el comportamiento esperado cambió

**Problema de timing:**
- Reemplazar waits fijos por `waitFor` o assertions con retry
- Agregar espera explícita al método del Page Object si el elemento tarda en aparecer

**Ambiente roto:**
- No modificar el test
- Reportarlo como bloqueado y continuar con los demás

**Escenario obsoleto:**
- Si la funcionalidad ya no existe: marcar el escenario con `@skip` y comentar la razón
- No eliminar nunca sin confirmación explícita del usuario

---

## Paso 5 — Verificar que el fix funciona

Después de cada fix, correr solo ese escenario para confirmar que pasa:
```bash
npm test -- --grep "nombre del escenario"
```

Si sigue fallando, volver al Paso 3 y re-investigar. No avanzar al siguiente hasta que el actual esté verde o marcado como bloqueado por ambiente.

---

## Paso 6 — Actualizar memory.md

Por cada fallo resuelto → agregar entrada en "Historial de fallos" de `memory.md`.
Por cada cambio en UI detectado → actualizar "Problemas conocidos de las páginas".
Por cada fix aplicado → agregar entrada en "Changelog de la suite".

## Paso 7 — Resumen final

Al terminar todos los fallos, presentar:

```
📊 RESUMEN DE AUDITORÍA

✅ SOLUCIONADOS: [N]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. [Nombre del escenario]
   Por qué fallaba: [causa concreta]
   Qué se cambió: [archivo y qué se modificó]
   Cómo se solucionó: [explicación breve]

⏸️ BLOQUEADOS POR AMBIENTE: [N]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. [Nombre del escenario] — [razón del bloqueo]

🔍 REQUIEREN DECISIÓN TUYA: [N]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. [Nombre del escenario] — [opciones: cerrar o actualizar]

ESTADO FINAL DEL SUITE: [N/N tests pasando]
```
