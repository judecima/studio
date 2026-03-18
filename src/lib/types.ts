
export type ColorGroup = 'claro' | 'medio' | 'oscuro';
export type ColorHue = 'blanco' | 'gris' | 'beige' | 'madera clara' | 'madera oscura' | 'negro' | 'azul' | 'verde' | 'otros';
export type StyleTag = 'moderno' | 'clasico' | 'industrial' | 'nordico' | 'minimalista';
export type UseCase = 'cocina' | 'placard' | 'oficina' | 'baño' | 'comedor';

export type Panel = {
  id: string;
  name: string;
  brand: string;
  width: number;
  height: number;
  thickness: number;
  hasGrain: boolean;
  description: string;
  stock: number;
  images: string[];
  mainImage: string;
  visible: boolean;
  createdAt: any;
  updatedAt: any;
  // Extended fields
  colorGroup: ColorGroup;
  colorHue: ColorHue;
  styleTags: string[];
  useCases: string[];
};

export type CombinationType = 'contraste' | 'armonia' | 'funcional';

export type Combination = {
  id: string;
  name: string;
  description: string;
  panelIds: string[];
  type: CombinationType;
  useCase: UseCase;
  previewImage?: string;
  createdAt: any;
  updatedAt: any;
  isApproved: boolean;
  isGeneratedAutomatically: boolean;
};

export type PanelFilters = {
  brand?: string;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  thickness?: number[];
  hasGrain?: boolean;
  search?: string;
  colorGroup?: ColorGroup;
  colorHue?: ColorHue;
};

export type UserRole = 'ADMIN' | 'USER';

export interface AppUser {
  uid: string;
  email: string | null;
  role: UserRole;
}
