import { Panel, Combination, ColorParent, ColorSub, SurfaceTexture, Finish, ColorSource } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export function createMockPanel(overrides?: Partial<Panel>): Panel {
  return {
    id: Math.random().toString(36).substr(2, 9),
    name: "Mock Panel",
    brand: "Generic",
    material: "MDF",
    width: 1830,
    height: 2750,
    thickness: 18,
    hasGrain: false,
    description: "Mock panel description",
    stock: 0,
    images: [],
    mainImage: "",
    visible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    
    colorParent: 'blanco',
    colorSub: 'medio claro',
    surfaceTexture: 'liso',
    finish: 'mate',
    antiFingerprint: false,

    // Nuevos campos obligatorios o recomendados
    materialType: 'unicolor',
    directionality: 'none',
    commercialLine: 'unknown',
    
    ...overrides
  };
}

export const MOCK_PANELS: Panel[] = [
  createMockPanel({
    id: "1",
    name: "Roble Claro Premium",
    brand: "Arauco",
    hasGrain: true,
    description: "Tablero de melamina sobre MDP con diseño de roble claro y textura sincronizada.",
    stock: 25,
    images: [PlaceHolderImages[0].imageUrl, PlaceHolderImages[2].imageUrl],
    mainImage: PlaceHolderImages[0].imageUrl,
    colorParent: 'marron',
    colorSub: 'claro',
    surfaceTexture: 'madera',
    finish: 'texturado',
    materialType: 'madera',
    directionality: 'veta',
    commercialLine: 'nature',
    styleTags: ['nordico', 'moderno'],
    useCases: ['cocina', 'placard']
  }),
  createMockPanel({
    id: "2",
    name: "Blanco Soft",
    brand: "Faplac",
    width: 2820,
    height: 1830,
    thickness: 15,
    hasGrain: false,
    description: "Melamina blanca mate de alta resistencia, ideal para interiores de placards.",
    stock: 150,
    images: [PlaceHolderImages[1].imageUrl],
    mainImage: PlaceHolderImages[1].imageUrl,
    colorParent: 'blanco',
    colorSub: 'muy claro',
    surfaceTexture: 'liso',
    finish: 'mate',
    materialType: 'unicolor',
    commercialLine: 'lisos',
    styleTags: ['minimalista', 'moderno'],
    useCases: ['placard', 'cocina']
  }),
  createMockPanel({
    id: "3",
    name: "Nogal Habano",
    brand: "Masisa",
    hasGrain: true,
    description: "Diseño clásico de nogal con vetas profundas y oscuras, acabado elegante.",
    stock: 12,
    images: [PlaceHolderImages[2].imageUrl],
    mainImage: PlaceHolderImages[2].imageUrl,
    colorParent: 'marron',
    colorSub: 'oscuro',
    surfaceTexture: 'madera',
    finish: 'texturado',
    materialType: 'madera',
    directionality: 'veta',
    styleTags: ['clasico', 'industrial'],
    useCases: ['oficina', 'comedor']
  }),
  createMockPanel({
    id: "4",
    name: "Gris Grafito",
    brand: "Egger",
    width: 2800,
    height: 2070,
    hasGrain: false,
    description: "Tono gris oscuro profundo, perfecto para contrastar con maderas claras.",
    stock: 30,
    images: [PlaceHolderImages[4].imageUrl],
    mainImage: PlaceHolderImages[4].imageUrl,
    colorParent: 'gris',
    colorSub: 'oscuro',
    surfaceTexture: 'liso',
    finish: 'mate',
    materialType: 'unicolor',
    styleTags: ['industrial', 'moderno'],
    useCases: ['cocina', 'oficina']
  })
];

export const MOCK_COMBINATIONS: Combination[] = [
  {
    id: "c1",
    name: "Dúo Nórdico Industrial",
    description: "Combinación equilibrada de Roble Claro con Gris Grafito.",
    panelIds: ["1", "4"],
    type: "contraste",
    useCase: "cocina",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isApproved: true,
    isGeneratedAutomatically: false
  }
];
