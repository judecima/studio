# Guía de Carga de Paneles: Optimización del Motor de Matching

Para que el motor de Studio identifique equivalencias con precisión industrial, la calidad del dato cargado es fundamental. Esta guía detalla cómo completar el formulario de administración para maximizar los resultados.

## 1. Campos Críticos (Impacto Directo en Ranking)

### Nombre y Código
- **Impacto**: Determina el **Identity Boost** (+7%) y el **Semantic Score** (18%).
- **Mejor Práctica**: Usa el nombre comercial oficial (ej: "Roble Escandinavo") y el código del fabricante (ej: "H1399"). El motor usa estos códigos para inferir acabados y texturas automáticamente si están en blanco.

### Familia Cromática (Color Parent)
- **Impacto**: Es el filtro primario. Si se carga mal, el panel queda "ciego" para su universo real.
- **Mejor Práctica**: Selecciona la familia predominante. Para paneles con mucha veta, elige la base cromática (ej: Marrón para un Roble, Gris para un Hormigón).

### Textura Superficial (Surface Texture)
- **Impacto**: Determina el factor de compatibilidad (16%).
- **Categorías Relevantes**:
  - **Liso**: Colores planos sin grano.
  - **Madera**: Todo lo que tenga veta (Natural o Sincronizada).
  - **Textil**: Hilados, linos, telas.
  - **Metal**: Aluminios, bronces, aceros.
  - **Cementicio/Piedra**: Hormigón, mármol, granito.

---

## 2. Recomendaciones de Expertos

### ¿Cuándo usar "Veta" (Has Grain)?
- Activa este switch siempre que el material tenga dirección o dibujo natural. Esto penaliza automáticamente a los paneles lisos en el ranking de ese producto para proteger la estética del proyecto.

### El dilema del "Blanco"
- Muchos blancos comerciales tienen texturas de madera o textil (ej: **Blanco Nature**, **Blanco Tundra**). 
- **Regla**: Clasifícalos por su **textura real** (Madera/Textil) aunque su color sea Blanco. El motor encontrará equivalencias blancas con la misma sensación táctil.

### Origen del Color (Color Source)
- Si tienes el código **NCS** o **RAL**, cárgalo. Esto establece la confianza al 100% y garantiza un cálculo de DeltaE impecable.
- Si subes una foto, asegúrate de que sea un render plano del catálogo oficial para que la extracción de color no se vea afectada por sombras.

---

## 3. Checklist de Calidad
- [ ] ¿El nombre incluye la marca si es un producto específico?
- [ ] ¿La familia cromática coincide visualmente con la miniatura?
- [ ] ¿La textura es coherente con el material comercial?
- [ ] ¿El código de fabricante está presente? (Fundamental para Egger/Faplac).

---
*Seguir estas reglas garantiza que el motor conecte tus productos con el resto del catálogo global de forma automática y precisa.*
