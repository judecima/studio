# Auditoría Técnica: Motor de Equivalencias Industriales (v5.5)

## 1. Resumen Ejecutivo
El sistema actual presenta una **divergencia del 37.5%** entre los resultados persistidos en la base de datos y lo que el motor de cálculo genera hoy. Esta desconexión, sumada a inconsistencias críticas en la normalización de datos (casing) y una lógica de extracción cromática excesivamente simplista, está degradando la calidad comercial de las recomendaciones. 

**Decisión Técnica: Sí, es imperativo realizar una resincronización total de equivalencias**, pero solo **después** de normalizar el dataset y refactorizar el motor bajo un esquema de "Filtros Duros".

---

## 2. Hallazgos Principales (Evidencia de Datos)

### A. Inconsistencia de Casing (Normalización Fallida)
El motor de búsqueda y el clasificador están diseñados para trabajar con minúsculas, pero el 100% de la base de datos tiene el campo `colorSub` en **Title Case**.
- **Ejemplo**: `Muy Claro` vs `muy claro`. 
- **Impacto**: Las comparaciones de categorías fallan silenciosamente, lo que obliga al motor a apoyarse casi exclusivamente en el valor LAB, ignorando la semántica industrial.

### B. Entropía en Texturas y Acabados
Se detectaron valores de textura que el motor no reconoce (fuera del enum estándar):
- **Valores detectados**: `Bark`, `Nature`, `Nórdico`, `Hilado`.
- **Falta de datos**: El **55% de los paneles (80/144)** tienen el campo `finish` como `undefined`, lo que anula la capacidad del motor de distinguir entre materiales Mate, Brillo o Satinado.

### C. Conflicto de Reglas de Negocio
- **API (`/api/match`)**: Excluye explícitamente la misma marca.
- **Sync Masivo**: Permite la misma marca.
- **Impacto**: El usuario ve resultados distintos en la ficha del panel comparado con lo que está guardado en Firestore.

---

## 3. Análisis del Motor de Cálculo (`engine.ts`)

### Falla de Diseño: Dominio del LAB
El score actual nace 100% del color LAB y luego aplica "penalizaciones" multiplicativas suaves.
- **El Problema**: Si una madera beige y un liso beige tienen el mismo color promedio, la penalización por textura actual no es lo suficientemente fuerte para separarlos.
- **Resultado**: Falsos positivos donde se recomiendan materiales visualmente distintos solo porque su "promedio de color" coincide.

### Extractor de Color (`extractor.ts`)
El recorte del 30% central y el promedio RGB "aplanan" la identidad del tablero.
- **Maderas con Veta**: Pierden el contraste de la fibra y se convierten en un color sólido "sucio".
- **Falta de Varianza**: El motor no sabe si el panel es uniforme o tiene una veta marcada, lo cual es vital para el matching industrial.

---

## 4. Comparativa: Persistencia vs. Recalculado
| Métrica | Valor |
| :--- | :--- |
| **Divergencia en Top 1** | 37.5% (54 paneles) |
| **Divergencia en Cobertura** | 3 casos detectados sin persistencia pero con cálculo dinámico |
| **Puntaje Promedio de Diferencia** | 2.94 puntos (variación neta) |

**Casos Críticos Detectados**:
- **Aluminio**: El Top 1 persistido es *Gris Caliza*, pero el recalculado sugiere *Litio*.
- **Camellia**: Presenta 20 matches dinámicos frente a 17 persistidos, con variaciones de score del 88% al 89%.

---

## 5. Hoja de Ruta Acciónable (Prioridad Alta)

### Fase 1: Saneamiento del Dataset (Inmediato)
- Ejecutar un script de **Normalización de Casing** para convertir `colorParent`, `colorSub`, `surfaceTexture` y `finish` a minúsculas estrictas.
- Mapear las texturas "huérfanas" (`Bark`, `Nature`) a las categorías estándar (`madera`, `textured`).

### Fase 2: Refactor del Motor (`engine.ts`)
1. **Implementar Filtros Duros**:
   - Maderas **NUNCA** deben coincidir con lisos (salvo override manual).
   - Familias cromáticas opuestas (ej: Rojo vs Verde) deben ser excluidas antes del score.
2. **Re-diseño del Score**: Pasar de penalizaciones multiplicativas a **Score Multicapa Ponderado** (Color 40%, Textura 30%, Semántica 20%, Acabado 10%).

### Fase 3: Mejora del Extractor (`extractor.ts`)
- Cambiar el promedio simple por un análisis de **3 a 5 parches** distribuidos.
- Guardar la **varianza de la paleta** (para identificar veta/textura).

### Fase 4: Resincronización Total
- Una vez aplicadas las fases 1 y 2, correr el script `re-sync-equivalences.ts`. **No sincronizar antes de limpiar el casing.**

---

## 6. Conclusión
El motor no está roto, pero está operando sobre datos ruidosos y con reglas demasiado permisivas. La "limpieza de casa" (normalización) es el paso que moverá la aguja de calidad más rápido que cualquier ajuste de pesos matemáticos.

**Archivos Generados para Auditoría Adicional:**
- [panels_full_export.json](file:///d:/ia/studio/tmp/panels_full_export.json)
- [panels_profile_summary.json](file:///d:/ia/studio/tmp/panels_profile_summary.json)
- [equivalence_anomalies.json](file:///d:/ia/studio/tmp/equivalence_anomalies.json)
- [equivalence_diff_report.json](file:///d:/ia/studio/tmp/equivalence_diff_report.json)
