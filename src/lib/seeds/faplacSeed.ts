
export interface FaplacSeedItem {
  name: string;
  line: string;
  category: "melamina" | "revestimiento" | "fondo" | "polimero";
  width: number;
  height: number;
  thickness: number;
  brand: "Faplac";
  hasGrain: boolean;
  description: string;
  hue: string;
}

export const FAPLAC_SEED: FaplacSeedItem[] = [
  // --- LINEA MESOPOTAMIA (Detalle del Catálogo) ---
  { 
    name: "Guayubira", 
    line: "Mesopotamia", 
    category: "melamina", 
    width: 1830, 
    height: 2750, 
    thickness: 18, 
    brand: "Faplac", 
    hasGrain: true,
    description: "Madera nativa de gran personalidad, con contrastes marcados entre vetas claras y oscuras. Aporta un diseño rústico y sofisticado.",
    hue: "madera clara"
  },
  { 
    name: "Curupay", 
    line: "Mesopotamia", 
    category: "melamina", 
    width: 1830, 
    height: 2750, 
    thickness: 18, 
    brand: "Faplac", 
    hasGrain: true,
    description: "Tono rojizo profundo con veta entrelazada. Representa la elegancia de las maderas nobles del noreste argentino.",
    hue: "madera oscura"
  },
  { 
    name: "Paraíso", 
    line: "Mesopotamia", 
    category: "melamina", 
    width: 1830, 
    height: 2750, 
    thickness: 18, 
    brand: "Faplac", 
    hasGrain: true,
    description: "Textura suave y tonalidad ámbar clara. Un clásico renovado que aporta calidez natural y luminosidad a los espacios.",
    hue: "madera clara"
  },
  { 
    name: "Teca", 
    line: "Mesopotamia", 
    category: "melamina", 
    width: 1830, 
    height: 2750, 
    thickness: 18, 
    brand: "Faplac", 
    hasGrain: true,
    description: "Diseño equilibrado de veta lineal y tono miel. Inspirada en maderas exóticas, ideal para ambientes contemporáneos.",
    hue: "madera clara"
  },
  { 
    name: "Lapacho", 
    line: "Mesopotamia", 
    category: "melamina", 
    width: 1830, 
    height: 2750, 
    thickness: 18, 
    brand: "Faplac", 
    hasGrain: true,
    description: "Madera oscura de gran presencia y elegancia, con vetas finas y profundas que realzan el mobiliario de alta gama.",
    hue: "madera oscura"
  },
  { 
    name: "Cedro", 
    line: "Mesopotamia", 
    category: "melamina", 
    width: 1830, 
    height: 2750, 
    thickness: 18, 
    brand: "Faplac", 
    hasGrain: true,
    description: "Tono cálido tradicional con la veta clásica del cedro misionero, aportando un aire de carpintería tradicional.",
    hue: "madera oscura"
  },
  // --- OTRAS LINEAS ---
  { 
    name: "Tuareg", 
    line: "Nórdica", 
    category: "melamina", 
    width: 1830, 
    height: 2750, 
    thickness: 18, 
    brand: "Faplac", 
    hasGrain: true,
    description: "Madera clara lavada, inspirada en el diseño escandinavo. Perfecta para ambientes luminosos.",
    hue: "madera clara"
  },
  { 
    name: "Lino Chiaro", 
    line: "Hilados", 
    category: "melamina", 
    width: 1830, 
    height: 2750, 
    thickness: 18, 
    brand: "Faplac", 
    hasGrain: false,
    description: "Textura textil que simula el lino natural. Aporta suavidad visual y táctil al interior de armarios.",
    hue: "beige"
  }
];
