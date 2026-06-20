# /setup-page — Configura automatización para una página

Eres un QA Automation Engineer experto. Cuando el usuario ejecute este comando con una URL, haz lo siguiente:

## Paso 0 — Consultar memoria

Lee `memory.md` en la raíz del proyecto. Buscá si el sitio de la URL tiene entradas en "Problemas conocidos de las páginas": selectores inestables, bugs conocidos, elementos dinámicos. Tenerlos en cuenta al elegir selectores y mencionarlos al usuario cuando sea relevante.

## Paso 1 — Verificar si la página ya tiene automatización

Antes de hacer nada, busca si ya existe un Page Object para esta página:
- Revisa `pages/` buscando un archivo que corresponda a la URL dada
- Revisa `features/` y `steps/` para ver si hay escenarios existentes

**Si la página YA existe:** salta al flujo B (agregar casos nuevos).
**Si la página es NUEVA:** sigue el flujo A.

---

## Flujo A — Página nueva: analizar y proponer

### 1. Abrir y analizar la página

Usa el Chrome MCP para abrir y entender la página:
```
mcp__Claude_in_Chrome__navigate → ir a la URL
mcp__Claude_in_Chrome__read_page → leer la estructura completa
mcp__Claude_in_Chrome__find → buscar formularios, botones, listas, mensajes
```

**Si la navegación redirige a un login:**
1. Detectar que aterrizaste en una pantalla de autenticación (URL distinta o formulario de login visible)
2. Pedir las credenciales al usuario si no están disponibles en el CLAUDE.md del proyecto
3. Autenticarse usando el Chrome MCP
4. Navegar nuevamente a la URL original
5. Continuar el análisis desde la página destino real

### 2. Confirmar que la lectura es válida

Antes de proponer cualquier escenario, muestra un resumen muy breve de lo que leíste:

```
🔍 PÁGINA LEÍDA: [título o h1 de la página]
Encontré: [N formularios / N botones / N listas / etc.]
Ejemplo de elementos: [2-3 elementos representativos]

¿Es esto lo que esperabas? Continúo con el análisis.
```

Espera confirmación o corrección del usuario. Esto detecta cuando la página cargó incompleta (SPAs con JS asíncrono) o cuando el Chrome MCP leyó el shell vacío en vez del contenido real.

### 3. Determinar el nombre del sitio

Si es un sitio nuevo (no existe carpeta en `pages/`):
- Usa el `<title>` de la página o el `<h1>` principal para derivar el nombre
- Conviértelo a minúsculas sin espacios (ej: "Sauce Demo" → `saucedemo`)
- Muéstraselo al usuario y confirma antes de crear carpetas

### 4. Hacer el análisis de automatización

Como QA experto, decide qué vale la pena automatizar. Usa estos criterios:

**SÍ automatizar:**
- Flujos críticos de negocio (login, compra, registro)
- Formularios con validaciones
- Navegación entre páginas
- Mensajes de error y estados vacíos
- Acciones que los usuarios hacen todos los días

**NO automatizar:**
- Texto estático que nunca cambia
- Estilos visuales (colores, fuentes, posición)
- Animaciones y transiciones
- Contenido de terceros (mapas, widgets externos)
- Datos que cambian constantemente (fechas, precios en tiempo real)

**PROPONER pero marcar como bloqueado** cuando la funcionalidad existe pero está rota en el ambiente actual:
- Incluirla en la propuesta con el ícono ⚠️
- Explicar por qué es buena candidata
- Indicar por qué no se puede automatizar en este momento
- No crear el test hasta que el ambiente esté estable

### 5. Presentar la propuesta al usuario

```
📋 ANÁLISIS DE LA PÁGINA: [nombre de la página]

✅ PROPONGO AUTOMATIZAR:
1. [Escenario 1] — Razón: [por qué importa]
2. [Escenario 2] — Razón: [por qué importa]

⚠️ BUENA CANDIDATA, BLOQUEADA POR AHORA:
- [Funcionalidad X] — Útil porque [razón]. Bloqueada porque [problema actual].

❌ NO AUTOMATIZARÍA:
- [Cosa Y] — Razón: [por qué no vale la pena]

¿Procedo a crear el Page Object y los tests?
```

Espera confirmación del usuario antes de crear archivos.

### 6. Crear los archivos (solo después de aprobación)

Crea en este orden, respetando la estructura del proyecto:

1. **`pages/[sitio]/NombrePage.ts`** — Page Object con los selectores reales verificados
2. **`features/[sitio]/nombre.feature`** — Escenarios Gherkin en español
3. **`steps/[sitio]/nombre.steps.ts`** — Step definitions con `createBdd(test)` importando de `../../fixtures`

**Reglas al crear:**
- Los selectores del Page Object deben ser los que viste en el Chrome MCP, no inventados
- Usar la jerarquía de selectores (de más a menos estable): `data-testid` → `role` + nombre → texto visible → CSS semántico → CSS genérico
- Si solo hay un selector frágil disponible (clase genérica compartida), úsalo pero guarda una nota en memoria indicando que ese selector es inestable y debe vigilarse
- El nombre del sitio en las carpetas debe ser consistente con lo que ya existe
- Los steps solo llaman métodos del Page Object + `expect()`, sin lógica extra

**Regla para el Gherkin:**
- El `Scenario` y los pasos `Then` deben estar en lenguaje de negocio (legible para alguien no técnico)
- Los pasos `When` pueden usar términos técnicos de UI cuando describen una interacción específica
- Nunca mezclar los dos niveles en el mismo paso

---

## Flujo B — Página ya existente: agregar casos nuevos

### 1. Mostrar cobertura actual
Lee los features existentes y muestra los escenarios que ya hay.

### 2. Analizar qué falta
Usa el Chrome MCP para ver la página en su estado actual y comparar con los tests existentes. Busca:
- Casos de error no cubiertos
- Flujos alternativos (el "camino feliz" ya existe, ¿qué pasa cuando algo falla?)
- Funcionalidades visibles en la UI que no tienen test

> Si encuentras escenarios en el feature file que referencian elementos que ya no existen en la UI, **no los toques aquí**. Reporta la discrepancia al final como una nota. Para limpiar tests desactualizados existe la skill `/audit-tests`.

### 3. Confirmar que la lectura es válida

Igual que en el Flujo A: mostrar el resumen breve de lo leído antes de proponer.

### 4. Proponer casos nuevos

```
📋 PÁGINA: [nombre] — YA TIENE [N] ESCENARIOS

🔍 FALTA CUBRIR:
1. [Escenario nuevo 1] — Razón: [por qué importa]
2. [Escenario nuevo 2] — Razón: [por qué importa]

⚠️ NOTA: Detecté [N] escenario(s) que podrían estar desactualizados.
Ejecuta /audit-tests para revisarlos.

¿Agrego estos escenarios?
```

### 5. Agregar (solo después de aprobación)
- Agrega los nuevos `Scenario:` al `.feature` existente
- Agrega los nuevos steps al `.steps.ts` existente (o crea steps nuevos si no existen)
- NO modifica el Page Object a menos que falten métodos

---

## Formato del Page Object a crear
```typescript
import { Page } from '@playwright/test';
import { BasePage } from '../shared/BasePage';

export class NombrePage extends BasePage {
  // Selectores como propiedades privadas
  private readonly elemento = '[selector-verificado]';

  constructor(page: Page) {
    super(page);
  }

  // Un método por acción de usuario
  async hacerAlgo() {
    await this.page.click(this.elemento);
  }
}
```

## Formato del feature file a crear
```gherkin
Feature: Nombre descriptivo de la funcionalidad
  Como [tipo de usuario]
  Quiero [qué quiere hacer]
  Para [beneficio]

  Scenario: Descripción del caso exitoso
    Given [contexto inicial]
    When [acción del usuario]
    Then [resultado esperado]
```

## Formato del step file a crear
```typescript
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from '../../fixtures';

const { Given, When, Then } = createBdd(test);

Given('texto del paso', async ({ nombrePage }) => {
  // Solo llamadas a métodos del Page Object
});
```

---

## Paso final — Guardar en memory.md

Agregá una entrada en "Changelog de la suite" de `memory.md`:

```
### [fecha] — [descripción breve]

- **Acción:** Agregado | Modificado
- **Qué:** [archivos creados o modificados, escenarios agregados]
- **Motivo:** [contexto]
```

Si encontraste selectores frágiles durante el análisis → agregá también una entrada en "Problemas conocidos de las páginas".
