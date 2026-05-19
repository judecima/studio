# Analisis de oportunidad de mejora del comparador de paneles

Fecha: 2026-05-19  
Base analizada: 144 documentos actuales de Firestore, coleccion `panels`.

## Resumen ejecutivo

El comparador de equivalencias tiene una base tecnica razonable: usa filtros duros por textura/acabado/veta/familia cromatica y luego puntua por color LAB, textura, semantica, acabado, luminosidad y confianza. La oportunidad principal no esta en agregar mas campos, sino en usar mejor los datos ya cargados.

Hoy los 144 paneles tienen `hexColor`, `labColor`, `colorParent`, `colorSub`, `colorHue`, `surfaceTexture`, `finish`, `materialType`, `directionality` y `colorGroup`. Sin embargo, no hay datos manuales cargados en `manualVerifiedMatches`, `manualRejectedMatches` ni `manualAffinity`. Por eso el comparador funciona 100% por heuristica y color extraido, aunque el modelo de datos ya permite correccion manual.

## Estado actual del motor

Referencias principales:

- `src/lib/equivalences/engine.ts`
- `src/lib/equivalences/classifier.ts`
- `src/lib/types.ts`
- `src/app/api/equivalences/route.ts`
- `src/app/api/match/route.ts`
- `src/app/api/admin/sync-color-groups/route.ts`

Flujo actual:

1. `classifyPanel` usa `labColor` si existe; si no existe, deriva LAB desde `hexColor`.
2. `passesHardFilters` excluye candidatos por mismo ID, rechazos manuales, textura incompatible, acabado incompatible, veta incompatible y familia cromatica incompatible.
3. `calculateScoreBreakdown` calcula score ponderado:
   - color: 35%
   - textura: 22%
   - semantica: 15%
   - identidad comercial: 10%
   - acabado: 8%
   - luminosidad: 7%
   - confianza: 3%
4. `getThresholdByTexture` aplica umbrales por textura.
5. `/api/match?id=...` recalcula bajo demanda.
6. `/api/equivalences` recalcula y persiste resultados para todos los paneles.

## Datos actuales cargados

Cobertura:

| Campo | Cobertura |
|---|---:|
| `hexColor` | 144/144 |
| `labColor` | 144/144 |
| `colorHue` | 144/144 |
| `colorParent` | 144/144 |
| `colorSub` | 144/144 |
| `surfaceTexture` | 144/144 |
| `finish` | 144/144 |
| `materialType` | 144/144 |
| `directionality` | 144/144 |
| `colorGroup` | 144/144 |
| `manualVerifiedMatches` | 0/144 |
| `manualRejectedMatches` | 0/144 |
| `manualAffinity` | 0/144 |

Distribucion de textura:

| Textura | Paneles |
|---|---:|
| madera | 59 |
| liso | 58 |
| textil | 14 |
| cementicio | 8 |
| metal | 5 |

Distribucion de acabado:

| Acabado | Paneles |
|---|---:|
| texturado | 58 |
| brillo | 42 |
| mate | 32 |
| supermate | 12 |

Distribucion de `colorHue`:

| colorHue | Paneles |
|---|---:|
| medio | 80 |
| oscuro | 36 |
| claro | 26 |
| medium | 2 |

## Hallazgos

### 1. Los campos manuales existen pero no estan siendo aprovechados

El tipo `Panel` ya contempla:

- `manualVerifiedMatches`
- `manualRejectedMatches`
- `manualAffinity`

El motor tambien los lee. `manualVerifiedMatches` puede saltar filtros duros, `manualRejectedMatches` bloquea candidatos y `manualAffinity` suma un boost. Pero los 144 paneles actuales tienen cero datos manuales en esos campos, y no se encontro una UI administrativa para editarlos.

Mejora recomendada: agregar una vista de curacion de equivalencias por panel, con acciones "confirmar", "rechazar" y "ajustar afinidad". Esto permitiria convertir experiencia comercial en datos reutilizables por el ranking.

### 2. `manualBoost` se calcula pero no impacta el total

`calculateScoreBreakdown` asigna `manualBoost`, pero la ponderacion final no lo suma al `total`. Esto hace que `manualAffinity` hoy sea poco util incluso si se cargara, salvo que se use `manualVerifiedMatches` para pasar filtros duros.

Mejora recomendada: incorporar `manualBoost` al total con una regla explicita. Ejemplo conservador:

- `manualVerifiedMatches`: forzar inclusion y score minimo visible.
- `manualRejectedMatches`: exclusion absoluta.
- `manualAffinity`: ajuste calibrado, no reemplazo total del score.

### 3. `hexColor`/`labColor` son el centro real del comparador

El campo `hexColor` esta completo en todos los paneles, y `labColor` tambien. El motor usa `labColor` para DeltaE CIEDE2000 y para luminosidad. Esto es positivo.

Mejora recomendada: tratar `labColor` como dato derivado de `hexColor` o de una muestra certificada, no como un campo independiente sin validacion. Conviene guardar tambien `colorSource` normalizado y, si hay recalculo, dejar trazabilidad:

- `hexColor`
- `labColor`
- `colorSource`
- `colorSampleMethod`
- `colorUpdatedAt`

### 4. `colorHue` no participa en el motor de equivalencias

Aunque `colorHue` esta completo, no se usa en `calculateScoreBreakdown` ni en `passesHardFilters`. El motor usa `colorSub` o diferencia de L en LAB para luminosidad.

Esto no es necesariamente malo: `colorHue` actual es muy grueso (`claro`, `medio`, `oscuro`) y perderia precision frente a LAB. Pero puede servir para:

- filtros rapidos en UI,
- fallback cuando falta LAB,
- explicaciones al usuario,
- auditoria de coherencia.

Mejora recomendada: no subirle peso directo si ya hay LAB, pero usarlo como validacion y fallback. Si se usa para scoring, debe ser una penalizacion suave, no un filtro duro.

### 5. Hay inconsistencias puntuales en `colorHue`

Se detectaron 2 valores `medium`, que no siguen la taxonomia usada por el sync (`claro`, `medio`, `oscuro`):

| ID | Nombre | L | colorHue actual | Esperado |
|---|---|---:|---|---|
| `amaranto` | Amaranto | 83.01 | medium | claro |
| `nogal-terracota` | Nogal Terracota | 41.57 | medium | medio |

Mejora recomendada: normalizar `colorHue` con una migracion simple y validar con enum o schema.

### 6. Hay 18 inconsistencias entre `colorSub` y luminosidad LAB

Ejemplos:

| ID | Nombre | L | colorSub actual | Esperado por L |
|---|---|---:|---|---|
| `egger-almendra` | Almendra | 92.85 | medio claro | muy claro |
| `baltico` | Baltico | 59.28 | claro | medio claro |
| `gris-basalto` | Gris Basalto | 61.46 | medio oscuro | medio claro |
| `seda-notte` | Seda Notte | 56.24 | medio oscuro | medio claro |
| `seda-azzurra-diseno-discontinuo` | Seda Azzurra - Diseno discontinuo | 13.68 | oscuro | muy oscuro |

Como el motor usa `labColor` para luminosidad cuando existe, estas inconsistencias afectan menos al score actual, pero pueden afectar filtros, UI, explicaciones o cualquier fallback.

Mejora recomendada: recalcular `colorSub` desde `labColor.l` y guardar fuente `colorSubSource = "lab"` o equivalente.

### 7. Existen 14 issues de datos ya marcados

Todos los issues detectados son del tipo `madera + brillo: sospechoso`. Ejemplos:

- `amaranto`
- `baltico`
- `cedro-woodtext`
- `helsinki`
- `kiri`
- `nogal-terracota`
- `roble-americano-nature`
- `roble-dakar-woodtext`
- `roble-escandinavo`

Esto importa porque el filtro duro de acabado puede bloquear `brillo` contra `mate`/`supermate`. Si "brillo" fue inferido por codigo o importacion y no representa el acabado real, puede eliminar equivalencias validas.

Mejora recomendada: separar `finish` comercial de `surfaceTexture`/terminacion tecnica, y revisar los paneles con issue antes de confiar en los filtros duros.

## Oportunidades priorizadas

### Prioridad alta

1. Crear UI/admin de curacion manual de equivalencias.
   - Mostrar top matches actuales.
   - Permitir confirmar, rechazar y asignar afinidad.
   - Persistir en `manualVerifiedMatches`, `manualRejectedMatches`, `manualAffinity`.

2. Hacer que `manualBoost` impacte el score final.
   - Hoy se calcula pero queda fuera del total.
   - Esto limita mucho el valor de cargar afinidades manuales.

3. Normalizar taxonomias.
   - `colorHue`: eliminar `medium`.
   - `colorSub`: recalcular desde `labColor.l`.
   - Validar enums antes de guardar.

4. Revisar acabado en maderas.
   - Los 14 casos `madera + brillo` pueden afectar los filtros duros.
   - Conviene distinguir brillo real, melamina brillo, textura madera y linea comercial.

### Prioridad media

5. Agregar auditoria de equivalencias.
   - Por cada panel: cantidad de candidatos filtrados por razon.
   - Top descartados cerca del umbral.
   - Explicacion tecnica de score.

6. Usar `colorHue` como fallback y QA, no como criterio principal.
   - Si existe LAB, LAB debe mandar.
   - Si falta LAB, `colorHue` puede ayudar a evitar falsos positivos.

7. Versionar el motor.
   - Guardar `engineVersion` en documentos de equivalencias.
   - Guardar `breakdown` completo para poder comparar cambios.

### Prioridad baja

8. Ampliar diccionarios semanticos por marca y linea.
   - Ejemplo: codigos ST de Egger, terminaciones Faplac, nombres comerciales.

9. Agregar metricas de calidad al dashboard admin.
   - Paneles sin equivalencias.
   - Paneles con datos incoherentes.
   - Paneles con color recalculado recientemente.

## Propuesta de implementacion incremental

### Paso 1: saneamiento de datos

- Migrar `colorHue = "medium"` a `medio` o `claro` segun LAB.
- Recalcular `colorSub` desde `labColor.l`.
- Marcar `colorSubSource = "lab"` cuando corresponda.
- Revisar manualmente los 14 `dataIssues`.

### Paso 2: hacer efectiva la curacion manual

- Ajustar el total para incluir `manualBoost`.
- Definir comportamiento para confirmados:
  - confirmar no deberia ocultar el breakdown;
  - si pasa por confirmacion manual, debe aparecer aunque el score heuristico quede bajo;
  - el score mostrado puede marcarse como "manual".

### Paso 3: crear pantalla de comparacion

Pantalla sugerida: `/admin/equivalences/[panelId]`.

Contenido:

- panel objetivo con `hexColor`, `colorHue`, `colorParent`, `colorSub`, textura y acabado;
- tabla de candidatos con score total y breakdown;
- botones de confirmar/rechazar;
- input de afinidad 0-100;
- indicador de campos incoherentes.

### Paso 4: auditoria automatica

Agregar un script o endpoint de diagnostico que devuelva:

- paneles sin matches;
- paneles con pocos matches;
- candidatos descartados por filtro duro;
- inconsistencias de color;
- cambios de ranking antes/despues de una modificacion del motor.

## Conclusion

El comparador no necesita partir de cero. Ya tiene buenos insumos cromaticos: 144/144 paneles con `hexColor` y `labColor`. La mejora mas importante es cerrar el ciclo entre heuristica y decision humana: hoy el esquema y el motor contemplan datos manuales, pero la base no tiene ninguno cargado y el `manualBoost` no impacta el total.

La segunda mejora clave es higiene de datos: normalizar `colorHue`, recalcular `colorSub` desde LAB y revisar acabados sospechosos en maderas. Con eso, el comparador quedaria mejor preparado para evaluar equivalencias por datos manuales, por `hexColor`/LAB y por agrupadores simples como `colorHue` sin mezclar responsabilidades.
