const { initializeFirebase } = require('../src/firebase');
const { collection, getDocs } = require('firebase/firestore');
const ncsColor = require('ncs-color');
const fs = require('fs');
const path = require('path');

async function generate() {
  try {
    const sdk = initializeFirebase();
    const db = sdk.firestore;
    const snap = await getDocs(collection(db, 'panels'));
    
    console.log(`- Paneles leídos: ${snap.size}`);
    
    const codes = new Set();
    snap.forEach(doc => {
      const d = doc.data();
      const ncs = (d.colorData?.ncs) || d.ncs;
      if (ncs) {
        const clean = ncs.replace(/\*/g, '').trim().toUpperCase();
        if (clean.length > 3) codes.add(clean);
      }
    });

    console.log(`- Códigos únicos: ${codes.size}`);
    
    const mapping = {};
    for (let code of Array.from(codes)) {
      try {
        let testCode = code;
        if (!testCode.startsWith('S ')) testCode = 'S ' + testCode;
        
        const rgb = ncsColor.rgb(testCode);
        if (rgb && rgb.startsWith('rgb')) {
          const m = rgb.match(/\d+/g);
          if (m) {
            const hex = '#' + m.map(x => parseInt(x).toString(16).padStart(2, '0')).join('').toUpperCase();
            mapping[code] = hex;
          }
        }
      } catch (e) {}
    }

    let out = `export const GENERATED_NCS_TO_HEX: Record<string, string> = {\n`;
    for (let [c, h] of Object.entries(mapping)) {
      out += `  '${c}': '${h}',\n`;
    }
    out += `};\n`;

    fs.writeFileSync('scripts/ncs-hex-generated.ts', out);
    console.log(`✅ Resultado: ${Object.keys(mapping).length} mapeos guardados.`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

generate();
