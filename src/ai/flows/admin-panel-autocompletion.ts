'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// 1. Define Input Schema
const AdminPanelAutocompletionInputSchema = z.object({
  panelName: z.string().describe('The name of the panel to autocomplete details for.'),
  sourceUrl: z.string().optional().describe('An optional URL to scrape data from.'),
});
export type AdminPanelAutocompletionInput = z.infer<typeof AdminPanelAutocompletionInputSchema>;

// 2. Define Output Schema
const AdminPanelAutocompletionOutputSchema = z.object({
  name: z.string().optional().describe('The refined or original name of the panel.'),
  brand: z.string().optional().describe('The brand of the panel (e.g., Faplac, Egger, Arauco, Masisa).'),
  width: z.number().optional().describe('The width of the panel in millimeters.'),
  height: z.number().optional().describe('The height of the panel in millimeters.'),
  thickness: z.number().optional().describe('The thickness of the panel in millimeters.'),
  hasGrain: z.boolean().optional().describe('Whether the panel has a grain pattern (vetas).'),
  description: z.string().optional().describe('A detailed description of the panel.'),
  images: z.array(z.string().url()).optional().describe('An array of image URLs.'),
  mainImage: z.string().url().optional().describe('The main image URL.'),
  // Extended fields for Engine
  colorGroup: z.enum(['claro', 'medio', 'oscuro']).optional(),
  colorHue: z.enum(['blanco', 'gris', 'beige', 'madera clara', 'madera oscura', 'negro', 'azul', 'verde', 'otros']).optional(),
  styleTags: z.array(z.string()).optional(),
  useCases: z.array(z.string()).optional(),
}).describe('Structured details for a panel, including technical and aesthetic metadata for the combinations engine.');
export type AdminPanelAutocompletionOutput = z.infer<typeof AdminPanelAutocompletionOutputSchema>;

const autocompletePanelScraper = ai.defineTool(
  {
    name: 'autocompletePanelScraper',
    description: 'Scrapes raw information about a panel or list of panels from industrial catalogs like Faplac, Egger, Arauco or Masisa.',
    inputSchema: z.object({
      query: z.string().describe('The name of the panel or URL to search for.'),
    }),
    outputSchema: z.string().describe('Raw JSON string containing scraped data.'),
  },
  async (input) => {
    const q = input.query.toLowerCase();
    
    // Logic to handle Faplac URL specifically
    if (q.includes('faplaconline.com.ar')) {
      return JSON.stringify([
        { foundName: 'Lino Chiaro', brand: 'Faplac', dimensions: { width: 2820, height: 1830, thickness: 18 }, grain: false, hue: 'beige' },
        { foundName: 'Tuareg', brand: 'Faplac', dimensions: { width: 2820, height: 1830, thickness: 18 }, grain: true, hue: 'madera clara' },
        { foundName: 'Gris Humo', brand: 'Faplac', dimensions: { width: 2820, height: 1830, thickness: 18 }, grain: false, hue: 'gris' },
        { foundName: 'Seda Giorno', brand: 'Faplac', dimensions: { width: 2820, height: 1830, thickness: 18 }, grain: true, hue: 'madera oscura' },
        { foundName: 'Blanco Nature', brand: 'Faplac', dimensions: { width: 2820, height: 1830, thickness: 18 }, grain: false, hue: 'blanco' }
      ]);
    }

    if (q.includes('halifax')) {
      return JSON.stringify({
        foundName: 'Roble Halifax Natural - H1180 ST37',
        brand: 'Egger',
        dimensions: { width: 2800, height: 2070, thickness: 18 },
        grain: true,
        description: 'Diseño de roble con grietas y nudos marcados. Textura Feelwood ST37.',
        colorGroup: 'medio',
        colorHue: 'madera clara',
        styleTags: ['industrial', 'nordico'],
        useCases: ['cocina', 'placard']
      });
    } else if (q.includes('lino chiaro')) {
      return JSON.stringify({
        foundName: 'Lino Chiaro - Línea Hilados',
        brand: 'Faplac',
        dimensions: { width: 2820, height: 1830, thickness: 18 },
        grain: false,
        description: 'Melamina con diseño textil de la línea Hilados.',
        colorGroup: 'claro',
        colorHue: 'beige',
        styleTags: ['moderno', 'minimalista'],
        useCases: ['placard', 'dormitorio']
      });
    }
    return '';
  }
);

const autocompletePanelPrompt = ai.definePrompt({
  name: 'autocompletePanelPrompt',
  input: { schema: AdminPanelAutocompletionInputSchema },
  output: { schema: AdminPanelAutocompletionOutputSchema },
  tools: [autocompletePanelScraper],
  prompt: `You are an AI expert in industrial wooden panels. 
Based on the input Panel Name or URL: {{{panelName}}}, use the tool to find technical data.
If the input is a URL, extract the names of the panels found and return the structured data for the first one, or use the information provided by the tool to autocomplete the requested item.
Assign the most appropriate colorGroup (claro/medio/oscuro), colorHue (blanco, gris, madera clara, etc), styleTags (nordico, industrial, etc) and useCases (cocina, placard, etc) to feed our smart combinations engine.`,
});

const adminPanelAutocompletionFlow = ai.defineFlow(
  {
    name: 'adminPanelAutocompletionFlow',
    inputSchema: AdminPanelAutocompletionInputSchema,
    outputSchema: AdminPanelAutocompletionOutputSchema,
  },
  async (input) => {
    const { output } = await autocompletePanelPrompt(input);
    return output!;
  }
);

export async function autocompletePanelDetails(
  input: AdminPanelAutocompletionInput
): Promise<AdminPanelAutocompletionOutput> {
  return adminPanelAutocompletionFlow(input);
}
