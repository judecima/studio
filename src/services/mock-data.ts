
import { Panel, Combination } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export const MOCK_PANELS: Panel[] = [
  {
    id: "1",
    name: "Roble Claro Premium",
    brand: "Arauco",
    width: 1830,
    height: 2600,
    thickness: 18,
    hasGrain: true,
    description: "Tablero de melamina sobre MDP con diseño de roble claro y textura sincronizada.",
    stock: 25,
    images: [PlaceHolderImages[0].imageUrl, PlaceHolderImages[2].imageUrl],
    mainImage: PlaceHolderImages[0].imageUrl,
    visible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    colorGroup: 'claro',
    colorHue: 'madera clara',
    styleTags: ['nordico', 'moderno'],
    useCases: ['cocina', 'placard']
  },
  {
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
    visible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    colorGroup: 'claro',
    colorHue: 'blanco',
    styleTags: ['minimalista', 'moderno'],
    useCases: ['placard', 'cocina']
  },
  {
    id: "3",
    name: "Nogal Habano",
    brand: "Masisa",
    width: 1830,
    height: 2500,
    thickness: 18,
    hasGrain: true,
    description: "Diseño clásico de nogal con vetas profundas y oscuras, acabado elegante.",
    stock: 12,
    images: [PlaceHolderImages[2].imageUrl],
    mainImage: PlaceHolderImages[2].imageUrl,
    visible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    colorGroup: 'oscuro',
    colorHue: 'madera oscura',
    styleTags: ['clasico', 'industrial'],
    useCases: ['oficina', 'comedor']
  },
  {
    id: "4",
    name: "Gris Grafito",
    brand: "Egger",
    width: 2800,
    height: 2070,
    thickness: 18,
    hasGrain: false,
    description: "Tono gris oscuro profundo, perfecto para contrastar con maderas claras.",
    stock: 30,
    images: [PlaceHolderImages[4].imageUrl],
    mainImage: PlaceHolderImages[4].imageUrl,
    visible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    colorGroup: 'oscuro',
    colorHue: 'gris',
    styleTags: ['industrial', 'moderno'],
    useCases: ['cocina', 'oficina']
  }
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
