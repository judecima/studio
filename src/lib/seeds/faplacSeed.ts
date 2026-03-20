
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
  // --- LINEA MESOPOTAMIA ---
  { 
    name: "Guayubira", 
    line: "Mesopotamia", 
    category: "melamina", 
    width: 1830, 
    height: 2750, 
    thickness: 18, 
    brand: "Faplac", 
    hasGrain: true,
    description: "Madera nativa de gran personalidad, con contrastes marcados entre vetas claras y oscuras. Aporta un diseño rústico y sofisticado inspirado en la selva misionera.",
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
    description: "Tono rojizo profundo con veta entrelazada. Representa la elegancia de las maderas nobles del noreste argentino con una textura profunda.",
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
    description: "Textura suave y tonalidad ámbar clara. Un clásico renovado que aporta calidez natural y luminosidad a los espacios contemporáneos.",
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
    description: "Diseño equilibrado de veta lineal y tono miel. Inspirada en maderas exóticas, ideal para ambientes que buscan serenidad y calidez.",
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
    description: "Madera oscura de gran presencia y elegancia, con vetas finas y profundas que realzan el mobiliario de alta gama y arquitectura de autor.",
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
    description: "Tono cálido tradicional con la veta clásica del cedro misionero, aportando un aire de carpintería tradicional con tecnología melamínica de vanguardia.",
    hue: "madera oscura"
  },
  // --- LINEA ETNIA ---
  { 
    name: "Everest", 
    line: "Etnia", 
    category: "melamina", 
    width: 1830, 
    height: 2750, 
    thickness: 18, 
    brand: "Faplac", 
    hasGrain: false,
    description: "Blanco puro con textura micro-mate. La máxima expresión de minimalismo y amplitud para diseños modernos.",
    hue: "blanco"
  },
  { 
    name: "Sahara", 
    line: "Etnia", 
    category: "melamina", 
    width: 1830, 
    height: 2750, 
    thickness: 18, 
    brand: "Faplac", 
    hasGrain: false,
    description: "Tono arena suave y cálido. Aporta equilibrio y naturalidad a cualquier ambiente residencial o comercial.",
    hue: "beige"
  }
];
