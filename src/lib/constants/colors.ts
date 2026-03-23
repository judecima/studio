/**
 * 💎 MATRIZ MAESTRA DE COLOR (Certificada NCS/LAB)
 * Datos optimizados para Colección 24+ de Egger y Líneas Actuales de Faplac.
 */

export interface MasterColorData {
  ncs: string;
  lab: { l: number; a: number; b: number };
  cat: string;
  name?: string;
}

export const FAPLAC_MASTER_DATA: Record<string, MasterColorData> = {
  // LISOS & DISEÑOS TENDENCIA
  "almendra": { ncs: "S 1005-Y20R", lab: { l: 84.5, a: 1.2, b: 6.8 }, cat: "beige" },
  "gris-humo": { ncs: "S 2500-N", lab: { l: 66.8, a: -0.1, b: -0.5 }, cat: "gris" },
  "gris-grafito": { ncs: "S 6500-N", lab: { l: 38.2, a: -0.2, b: -0.8 }, cat: "gris" },
  "amaranto": { ncs: "S 4040-R10B", lab: { l: 35.1, a: 42.5, b: 12.8 }, cat: "merlot" },
  "amatista": { ncs: "S 1505-R80B", lab: { l: 78.1, a: 2.1, b: -4.5 }, cat: "beige" },
  "amberes": { ncs: "S 8000-N", lab: { l: 18.4, a: -0.2, b: -0.4 }, cat: "negro" },
  "negro-profundo": { ncs: "S 9000-N", lab: { l: 5.2, a: 0.0, b: 0.0 }, cat: "negro" },
  "blanco-nature": { ncs: "S 0502-Y", lab: { l: 92.1, a: -0.5, b: 2.1 }, cat: "blanco" },
  "blanco-tundra": { ncs: "S 0300-N", lab: { l: 95.5, a: 0.0, b: 0.0 }, cat: "blanco" },
  
  // MADERAS & NÓRDICOS
  "helsinki": { ncs: "S 1505-Y30R", lab: { l: 81.4, a: 2.5, b: 11.2 }, cat: "madera" },
  "baltico": { ncs: "S 2010-Y20R", lab: { l: 75.2, a: 4.1, b: 14.5 }, cat: "madera" },
  "paraiso": { ncs: "S 2020-Y30R", lab: { l: 71.8, a: 8.2, b: 22.4 }, cat: "madera" },
  "roble-americano": { ncs: "S 3020-Y20R", lab: { l: 62.5, a: 12.1, b: 25.4 }, cat: "madera" },
  "olmo-finlandes": { ncs: "S 1502-Y", lab: { l: 82.5, a: 0.5, b: 4.2 }, cat: "madera" },
  "nogal-terracota": { ncs: "S 5020-Y50R", lab: { l: 45.4, a: 15.2, b: 22.1 }, cat: "madera" },
  
  // HILADOS (Textiles)
  "seda-giorno": { ncs: "S 2005-Y20R", lab: { l: 76.5, a: 2.1, b: 8.4 }, cat: "beige" },
  "tweed": { ncs: "S 4005-Y20R", lab: { l: 58.2, a: 1.5, b: 6.2 }, cat: "gris" },
  "linosa-cinza": { ncs: "S 3502-Y", lab: { l: 62.4, a: 0.8, b: 3.5 }, cat: "gris" }
};

export const EGGER_MASTER_DATA: Record<string, MasterColorData> = {
  // UNICOLORES (U)
  "u155": { name: "Sahara", ncs: "S 2005-Y40R", lab: { l: 75.4, a: 2.8, b: 10.5 }, cat: "beige" },
  "u222": { name: "Crema", ncs: "S 0505-Y40R", lab: { l: 91.2, a: 1.5, b: 8.2 }, cat: "beige" },
  "u250": { name: "Beige Caramelo", ncs: "S 3020-Y30R", lab: { l: 65.2, a: 12.4, b: 28.5 }, cat: "beige" },
  "u707": { name: "Gris Seda", ncs: "S 1500-N", lab: { l: 81.3, a: -0.1, b: -0.2 }, cat: "gris" },
  "u708": { name: "Gris Sombra", ncs: "S 2002-G50Y", lab: { l: 76.4, a: -0.5, b: 1.8 }, cat: "gris" },
  "u732": { name: "Gris Macadán", ncs: "S 5000-N", lab: { l: 51.5, a: -0.2, b: -0.6 }, cat: "gris" },
  "u325": { name: "Rosa Antiguo", ncs: "S 3010-R10B", lab: { l: 62.5, a: 12.4, b: 5.2 }, cat: "merlot" },
  "u390": { name: "Rojo Indiano", ncs: "S 4040-R", lab: { l: 38.5, a: 45.2, b: 18.4 }, cat: "merlot" },
  "w1100": { name: "Blanco Alpino", ncs: "S 0502-G50Y", lab: { l: 94.2, a: -0.8, b: 1.2 }, cat: "blanco" },
  
  // MADERAS (H)
  "h1401": { name: "Pino Cascina", ncs: "S 1002-G50Y", lab: { l: 86.2, a: -0.4, b: 2.5 }, cat: "madera" },
  "h3170": { name: "Roble Kendal", ncs: "S 2005-Y20R", lab: { l: 76.8, a: 3.2, b: 12.1 }, cat: "madera" },
  "h3303": { name: "Roble Hamilton", ncs: "S 2010-Y30R", lab: { l: 74.2, a: 5.1, b: 18.4 }, cat: "madera" },
  
  // MATERIALES (F)
  "f416": { name: "Textil Beige", ncs: "S 2005-Y20R", lab: { l: 75.8, a: 2.4, b: 9.1 }, cat: "textil" },
  "f417": { name: "Textil Gris", ncs: "S 3005-Y20R", lab: { l: 65.2, a: 1.8, b: 7.4 }, cat: "textil" }
};

/**
 * Mapeo de códigos NCS a valores hexadecimales aproximados.
 */
export const NCS_TO_HEX: Record<string, string> = {
  // Blancos
  'S 0502-Y': '#F5F5F0',
  'S 1002-Y': '#F0F0E8',
  'S 0601-B': '#F2F2F5',
  'S 1005-G50Y': '#E8EAE0',
  'S 1502-Y': '#E8E8DD',
  'S 2002-Y': '#E0E0D0',
  // Grises
  'S 1502-Y50R': '#E0D8CC',
  'S 2005-Y20R': '#D8D0C0',
  'S 3005-Y20R': '#C8BCA8',
  'S 4005-Y20R': '#B8AA94',
  'S 5005-Y20R': '#A89880',
  'S 1502-G50Y': '#D8DCD0',
  'S 2005-G50Y': '#C8CCB8',
  'S 3005-G50Y': '#B0B8A0',
  'S 4005-G50Y': '#A0A888',
  'S 5005-G50Y': '#909878',
  'S 1005-B80G': '#D8E0DC',
  'S 2005-B80G': '#C0CCC8',
  'S 3005-B80G': '#A8B8B0',
  'S 4005-B80G': '#90A098',
  'S 5005-B80G': '#808C84',
  // Beiges
  'S 1015-Y40R': '#E8C8A0',
  'S 2010-Y30R': '#D8B888',
  'S 2020-Y20R': '#C8A870',
  'S 3020-Y30R': '#B89060',
  'S 1015-Y20R': '#E8CCA0',
  'S 1005-Y40R': '#F0D8B0',
  'S 2015-Y30R': '#D0B080',
  'S 3015-Y30R': '#C09870',
  'S 4015-Y30R': '#B08860',
  'S 5015-Y30R': '#A07850',
  'S 1020-Y30R': '#E0B880',
  'S 2020-Y30R': '#D0A870',
  'S 3020-Y20R': '#C09868',
  'S 4020-Y30R': '#B08858',
  'S 5020-Y30R': '#A07848',
  'S 1020-Y20R': '#E0BC88',
  'S 2020-Y10R': '#D0AC78',
  'S 3020-Y10R': '#C09C68',
  'S 4020-Y10R': '#B08C58',
  'S 5020-Y10R': '#A07C48',
  'S 1015-Y30R': '#E8C498',
  'S 2015-Y20R': '#D8B480',
  'S 3015-Y20R': '#C8A470',
  'S 4015-Y20R': '#B89460',
  'S 5015-Y20R': '#A88450',
  // Rojos
  'S 3040-Y80R': '#B84C30',
  'S 4040-Y80R': '#A04028',
  'S 5040-Y80R': '#883420',
  'S 3050-Y90R': '#B03428',
  'S 4050-Y90R': '#982C20',
  'S 5050-Y90R': '#802418',
  'S 3060-Y80R': '#A83828',
  'S 4060-Y80R': '#902C20',
  'S 5060-Y80R': '#782418',
  'S 3070-Y70R': '#A02820',
  'S 4070-Y70R': '#882018',
  'S 5070-Y70R': '#701810',
  // Maderas
  'S 6020-Y50R': '#785030',
  'S 5020-Y50R': '#886040',
  'S 4020-Y50R': '#987050',
  'S 3020-Y50R': '#A88060',
  'S 2020-Y50R': '#B89070',
  'S 6030-Y60R': '#684020',
  'S 5030-Y60R': '#785028',
  'S 4030-Y60R': '#886038',
  'S 3030-Y60R': '#987048',
  'S 2030-Y60R': '#A88058',
  'S 7010-Y50R': '#583820',
  'S 6010-Y50R': '#684828',
  'S 5010-Y50R': '#785838',
  'S 4010-Y50R': '#886848',
  'S 3010-Y50R': '#987858',
  'S 7020-Y30R': '#503020',
  'S 6020-Y30R': '#604028',
  'S 8010-Y60R': '#403018',
  'S 7010-Y60R': '#503820',
  'S 6010-Y60R': '#604828',
  'S 5010-Y60R': '#705838',
  'S 4010-Y60R': '#806848',
  // Negros
  'S 9000-N': '#1A1A1A',
  'S 8500-N': '#2A2A2A',
  'S 8000-N': '#3A3A3A',
  'S 7500-N': '#4A4A4A',
  'S 7000-N': '#5A5A5A',
  'S 6500-N': '#6A6A6A',
  'S 6000-N': '#7A7A7A',
  'S 5500-N': '#8A8A8A',
  'S 5000-N': '#9A9A9A',
  'S 1000-N': '#F0F0F0',
  'S 1500-N': '#E8E8E8',
  'S 2000-N': '#E0E0E0',
  'S 2500-N': '#D8D8D8',
  'S 3000-N': '#D0D0D0',
  'S 3500-N': '#C8C8C8',
  'S 4000-N': '#C0C0C0',
  'S 4500-N': '#B8B8B8',
  'S 1505-Y30R': '#E0C0A0',
  'S 2505-Y30R': '#D0B088',
  'S 3505-Y30R': '#C0A070',
  'S 4505-Y30R': '#B09060',
  'S 5505-Y30R': '#A08050',
  'S 6505-Y30R': '#907040',
  'S 7505-Y30R': '#806030',
  'S 8505-Y30R': '#705020',
  'S 2502-G50Y': '#D0D4B8',
  'S 3502-G50Y': '#C0C4A8',
  'S 4502-G50Y': '#B0B498',
  'S 5502-G50Y': '#A0A488',
  'S 6502-G50Y': '#909478',
  'S 7502-G50Y': '#808468',
  'S 8502-G50Y': '#707458',
  'S 1502-B': '#E0E0F0',
  'S 2502-B': '#D0D0E0',
  'S 3502-B': '#C0C0D0',
  'S 4502-B': '#B0B0C0',
  'S 5502-B': '#A0A0B0',
  'S 6502-B': '#9090A0',
  'S 7502-B': '#808090',
  'S 8502-B': '#707080',
  'S 1005-R90B': '#E0D0E8',
  'S 2005-R90B': '#D0C0D8',
  'S 3005-R90B': '#C0B0C8',
  'S 4005-R90B': '#B0A0B8',
  'S 5005-R90B': '#A090A8',
  'S 6005-R90B': '#908098',
  'S 7005-R90B': '#807088',
  'S 8005-R90B': '#706078',
  'S 1010-B10G': '#D0E0E0',
  'S 2010-B10G': '#C0D0D0',
  'S 3010-B10G': '#B0C0C0',
  'S 4010-B10G': '#A0B0B0',
  'S 5010-B10G': '#90A0A0',
  'S 6010-B10G': '#809090',
  'S 7010-B10G': '#708080',
  'S 8010-B10G': '#607070',
  'S 1505-G30Y': '#D8E0B0',
  'S 2505-G30Y': '#C8D0A0',
  'S 3505-G30Y': '#B8C090',
  'S 4505-G30Y': '#A8B080',
  'S 5505-G30Y': '#98A070',
  'S 6505-G30Y': '#889060',
  'S 7505-G30Y': '#788050',
  'S 8505-G30Y': '#687040',
  'S 1005-Y70R': '#F0C8A0',
  'S 2005-Y70R': '#E0B890',
  'S 3005-Y70R': '#D0A880',
  'S 4005-Y70R': '#C09870',
  'S 5005-Y70R': '#B08860',
  'S 6005-Y70R': '#A07850',
  'S 7005-Y70R': '#906840',
  'S 8005-Y70R': '#805830',
};

export function ncsToHex(ncsCode: string): string | null {
  const clean = ncsCode.replace(/\*/g, '').trim();
  if (NCS_TO_HEX[clean]) return NCS_TO_HEX[clean];
  if (clean.match(/S\s*[0-9]{4}-N/)) {
    const num = parseInt(clean.match(/\d{4}/)?.[0] || '0', 10);
    if (num >= 9000) return '#1A1A1A';
    if (num >= 8000) return '#333333';
    if (num >= 7000) return '#4D4D4D';
    if (num >= 6000) return '#666666';
    if (num >= 5000) return '#808080';
    if (num >= 4000) return '#999999';
    if (num >= 3000) return '#B3B3B3';
    if (num >= 2000) return '#CCCCCC';
    if (num >= 1000) return '#E6E6E6';
    return '#F0F0F0';
  }
  if (clean.match(/Y[0-9]+R/)) return '#E0B880';
  return null;
}

export const NCS_COLOR_GROUPS: Record<string, string> = {
  'S 1015-Y40R': 'beige', 'S 2010-Y30R': 'beige', 'S 2020-Y20R': 'beige',
  'S 3020-Y30R': 'beige', 'S 5010-Y10R': 'gris', 'S 4005-Y20R': 'gris',
  'S 0601-B': 'blanco', 'S 0502-Y': 'blanco', 'S 9000-N': 'negro',
  'S 3040-Y80R': 'merlot', 'S 6020-Y50R': 'madera'
};

export function inferColorGroupFromNcs(ncsCode: string): string | null {
  const clean = ncsCode.replace(/\*/g, '').trim();
  if (NCS_COLOR_GROUPS[clean]) return NCS_COLOR_GROUPS[clean];
  if (clean.match(/[BY][0-9]+R/i)) return 'beige';
  if (clean.match(/[BY][0-9]+Y/i)) return 'beige';
  if (clean.match(/[BY][0-9]+G/i)) return 'gris';
  if (clean.match(/S\s*[0-9]{4}-[BY]/i)) return 'beige';
  if (clean.match(/S\s*[0-9]{4}-[GN]/i)) return 'gris';
  if (clean.match(/S\s*[0-9]{4}-N/i)) {
    const num = parseInt(clean.match(/\d{4}/)?.[0] || '0', 10);
    if (num >= 8500) return 'negro';
    if (num <= 1000) return 'blanco';
    return 'gris';
  }
  return null;
}
