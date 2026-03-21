/**
 * Semilla de datos para Egger.
 * Implementación MVP con códigos reales y dimensiones estándar de Egger.
 */
export async function getEggerSeedData(): Promise<any[]> {
  const seed = [
    { code: "H1180", name: "Roble Halifax Natural", texture: "ST37", hue: "madera clara" },
    { code: "H1181", name: "Roble Halifax Tabaco", texture: "ST37", hue: "madera oscura" },
    { code: "W1000", name: "Blanco Premium", texture: "ST9", hue: "blanco" },
    { code: "U999", name: "Negro", texture: "ST2", hue: "negro" },
    { code: "U708", name: "Gris Claro", texture: "ST9", hue: "gris" },
    { code: "H3303", name: "Roble Hamilton", texture: "ST10", hue: "madera clara" },
    { code: "F186", name: "Hormigón Chicago Gris Claro", texture: "ST9", hue: "gris" }
  ];

  return seed.map(item => ({
    name: `${item.name} - ${item.code} ${item.texture}`,
    sku: item.code,
    brand: 'Egger',
    width: 2800,
    height: 2070,
    thickness: 18,
    description: `Tablero de melamina Egger con acabado ${item.texture}. Diseño de alta fidelidad para mobiliario moderno. Tonalidad: ${item.hue}.`,
    images: [`https://picsum.photos/seed/${item.code}/800/600`],
    mainImage: `https://picsum.photos/seed/${item.code}/800/600`,
    source: 'egger_seed',
    isSmooth: item.texture === 'ST9' || item.texture === 'ST2',
    surfaceTexture: item.texture,
    launchYear: 2024
  }));
}
