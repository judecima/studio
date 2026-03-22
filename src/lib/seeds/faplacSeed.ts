
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
 
];
