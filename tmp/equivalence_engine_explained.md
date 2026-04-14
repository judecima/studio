# Documentación Técnica: Motor de Equivalencias v6.8

El motor de matching industrial de **Studio** es un sistema de búsqueda multicriterio diseñado para identificar tableros melamínicos y de MDF técnica y estéticamente compatibles entre diferentes fabricantes (Egger, Faplac, Arauco, etc.).

## 1. Arquitectura de Dos Capas

El motor opera en un pipeline secuencial para garantizar velocidad y precisión.

### Capa A: Filtros Duros (Industrial Veto)
Antes de puntuar, el sistema aplica reglas de exclusión para evitar matches imposibles:
- **Relación de Textura**: Utiliza una **Matriz de Relación Sensorial** gradual. Si la afinidad entre dos texturas (ej: Madera vs Metal) es inferior a **0.30**, el match se descarta inmediatamente.
- **Incompatibilidad Cromática**: Evita cruces entre familias opuestas (ej: Rojo vs Verde), exceptuando los colores neutros (Gris, Blanco, Beige) que actúan como puentes universales.
- **Bloqueos Manuales**: Respeta las exclusiones registradas por administradores en la base de datos.

### Capa B: Score Multicapa (Ranking)
Si el panel supera los filtros duros, se calcula un score de **0 a 100** basado en los siguientes factores:

| Factor | Peso | Descripción |
| :--- | :--- | :--- |
| **Color (LAB)** | 40% | Distancia deltaE (CIEDE2000) entre los colores extraídos de imágenes o certificados. |
| **Semántica** | 18% | Coincidencia de términos comerciales (Roble, Cemento, etc.) distinguiendo entre términos fuertes y genéricos. |
| **Textura** | 16% | Afinidad gradual según la matriz de texturización industrial. |
| **Luminosidad** | 8% | Diferencia en el canal L (Lightness) para asegurar que el "peso" visual sea similar. |
| **Acabado (Finish)** | 8% | Coincidencia de tipo de brillo o textura superficial (Mate, Satinado, etc.). |
| **Identity Boost** | 7% | Bono por coincidencia exacta de nombre o tokens de identidad comercial única. |
| **Confianza** | 3% | Basado en el origen del dato (NCS > Analítico > Inferencia). |

---

## 2. Conceptos Clave

### Matriz de Relación Sensorial
A diferencia de sistemas antiguos, Studio no prohíbe el cruce entre materiales si el color es extremadamente parecido. Por ejemplo, un **Gris Caliza** (Liso) es un match válido para un **Aluminio** (Metal) con una afinidad de **0.92**.

### Identity Boost (Bono de Marca)
Si dos paneles comparten exactamente el mismo nombre comercial (ej: `Almendra` de Faplac vs `Almendra` de Egger), el sistema otorga un bono que prioriza esta identidad por encima de similitudes cromáticas genéricas con otros paneles.

### Umbrales Dinámicos (Thresholds)
El motor aplica un "piso" de entrada según la textura del target:
- **Madera**: 0.64 (Más estricto para proteger la veta).
- **Liso / Metales**: 0.62 (Más flexible para priorizar color).

---

## 3. Lo que el motor NO hace
- No utiliza solo el color (LAB) para decidir; requiere validación estructural.
- No excluye la misma marca del ranking, permitiendo encontrar alternativas dentro del mismo catálogo.
- No aplica "hards-codes" por ID; todas las decisiones son algorítmicas y basadas en los atributos del panel.
