// Type declaration for culori — comprehensive for current app usage
declare module 'culori' {
  export type Mode = 'rgb' | 'lab' | 'lch' | 'hsl' | 'p3' | string;
  export type Color = { mode: string; l?: number; a?: number; b?: number; r?: number; g?: number; [key: string]: any };
  
  export function converter(mode: Mode): (color: Color | string) => Color;
  export function formatHex(color: Color | string): string;
  export function differenceCie76(): (a: Color, b: Color) => number;
  export function differenceCiede2000(): (a: Color, b: Color) => number;
  export function parse(color: string): Color | undefined;
}