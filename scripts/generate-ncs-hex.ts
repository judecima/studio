import { initializeFirebase } from '../src/firebase';
import { collection, getDocs } from 'firebase/firestore';
// @ts-ignore
import ncsColor from 'ncs-color';
import fs from 'fs';
import path from 'path';

async function generateNcsHex() {
  const sdk = initializeFirebase();
  const db = sdk.firestore;
  const panelsRef = collection(db, 'panels');
  const snapshot = await getDocs(panelsRef);

  const ncsCodes = new Set<string>();
  snapshot.forEach(doc => {
    const data = doc.data();
    const ncs = (data.colorData?.ncs) || (data as any).ncs;
    if (ncs) {
      const clean = ncs.replace(/\*/g, '').trim();
      if (clean.length > 5) {
         ncsCodes.add(clean.toUpperCase());
      }
    }
  });

  console.log(`🔍 Códigos únicos a procesar:`, Array.from(ncsCodes));

  const mapping: Record<string, string> = {};
  for (let code of Array.from(ncsCodes)) {
    try {
      // Intentar limpiar el código (eliminar prefijos innecesarios si fallan)
      let cleanCode = code;
      if (!cleanCode.startsWith('S ')) cleanCode = 'S ' + cleanCode;
      
      const rgbStr = ncsColor.rgb(cleanCode); 
      console.log(`- ${code} -> ${rgbStr}`);
      
      if (rgbStr && rgbStr.startsWith('rgb')) {
        const matches = rgbStr.match(/\d+/g);
        if (matches && matches.length === 3) {
          const r = parseInt(matches[0]);
          const g = parseInt(matches[1]);
          const b = parseInt(matches[2]);
          mapping[code] = rgbToHex(r, g, b);
        }
      }
    } catch (e: any) {
      // Si falla con 'S ', probar sin 'S '
      try {
         const cleanCode = code.replace(/^S\s*/i, '');
         const rgbStr = ncsColor.rgb(cleanCode);
         if (rgbStr) {
            const matches = rgbStr.match(/\d+/g);
            if (matches) {
              mapping[code] = rgbToHex(parseInt(matches[0]), parseInt(matches[1]), parseInt(matches[2]));
            }
         }
      } catch (e2) {}
    }
  }

  let output = `export const GENERATED_NCS_TO_HEX: Record<string, string> = {\n`;
  for (const [code, hex] of Object.entries(mapping)) {
    output += `  '${code}': '${hex}',\n`;
  }
  output += `};\n`;

  fs.writeFileSync('scripts/ncs-hex-generated.ts', output);
  console.log(`✅ Guardadas ${Object.keys(mapping).length} entradas.`);
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

generateNcsHex().catch(console.error);
