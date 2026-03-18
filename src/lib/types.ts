
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
  createdAt: string;
  updatedAt: string;
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
};

export type UserRole = 'ADMIN' | 'USER';

export interface AppUser {
  uid: string;
  email: string | null;
  role: UserRole;
}
