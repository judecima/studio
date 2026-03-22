// Type declaration for culori — full types available via @types/culori if needed
declare module 'culori' {
  export type Mode = 'rgb' | 'lab' | 'lch' | 'hsl' | 'p3' | string;
  export type Color = { mode: string; [key: string]: any };
  export function converter(mode: Mode): (color: Color | string) => Color;
  export function formatHex(color: Color | string): string;
  export function differenceCie76(): (a: Color, b: Color) => number;
  export function parse(color: string): Color | undefined;
}
