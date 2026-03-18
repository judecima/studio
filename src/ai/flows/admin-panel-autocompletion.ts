'use server';
/**
 * @fileOverview This file defines a Genkit flow for autocompleting panel details based on a panel name.
 * It uses a generative AI model to process scraped data (simulated by a tool) and structure it into a defined schema.
 * It specifically references Faplac as a key source for panel information.
 *
 * - autocompletePanelDetails - A function that triggers the autocompletion flow.
 * - AdminPanelAutocompletionInput - The input type for the autocompletion.
 * - AdminPanelAutocompletionOutput - The return type for the autocompletion.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// 1. Define Input Schema
const AdminPanelAutocompletionInputSchema = z.object({
  panelName: z.string().describe('The name of the panel to autocomplete details for.'),
});
export type AdminPanelAutocompletionInput = z.infer<typeof AdminPanelAutocompletionInputSchema>;

// 2. Define Output Schema
const AdminPanelAutocompletionOutputSchema = z.object({
  name: z.string().optional().describe('The refined or original name of the panel.'),
  brand: z.string().optional().describe('The brand of the panel (e.g., Faplac, Arauco, Masisa).'),
  width: z.number().optional().describe('The width of the panel in millimeters.'),
  height: z.number().optional().describe('The height of the panel in millimeters.'),
  thickness: z.number().optional().describe('The thickness of the panel in millimeters.'),
  hasGrain: z.boolean().optional().describe('Whether the panel has a grain pattern (vetas).'),
  description: z.string().optional().describe('A detailed description of the panel, including line/collection information.'),
  images: z.array(z.string().url()).optional().describe('An array of image URLs for the panel.'),
  mainImage: z.string().url().optional().describe('The main image URL for the panel.'),
}).describe('Structured details for a panel, autocompleted from external sources like Faplac.');
export type AdminPanelAutocompletionOutput = z.infer<typeof AdminPanelAutocompletionOutputSchema>;

// 3. Define a placeholder tool for the Cloud Function scraping.
// This tool simulates searching in catalogs like Faplac (https://www.faplaconline.com.ar/home/c/ar-faplac)
const autocompletePanelScraper = ai.defineTool(
  {
    name: 'autocompletePanelScraper',
    description: 'Scrapes raw information about a panel from catalogs like Faplac, Arauco or Masisa based on its name.',
    inputSchema: z.object({
      query: z.string().describe('The name of the panel to search for.'),
    }),
    outputSchema: z.string().describe('Raw JSON string containing scraped data from catalogs.'),
  },
  async (input) => {
    const q = input.query.toLowerCase();
    
    // Mock data based on Faplac's real catalog patterns
    if (q.includes('lino chiaro')) {
      return JSON.stringify({
        foundName: 'Lino Chiaro - Línea Hilados',
        brand: 'Faplac',
        dimensions: { width: 2820, height: 1830, thickness: 18 },
        grain: false,
        description: 'Melamina con diseño textil de la línea Hilados. Textura hilada que aporta calidez y realismo al mobiliario.',
        images: ['https://picsum.photos/seed/lino/800/600'],
        source: 'https://www.faplaconline.com.ar/home/c/ar-faplac'
      });
    } else if (q.includes('tuareg')) {
      return JSON.stringify({
        foundName: 'Tuareg - Línea Nórdica',
        brand: 'Faplac',
        dimensions: { width: 2820, height: 1830, thickness: 18 },
        grain: true,
        description: 'Diseño de madera clara con vetas suaves, ideal para ambientes modernos y minimalistas.',
        images: ['https://picsum.photos/seed/tuareg/800/600'],
        source: 'https://www.faplaconline.com.ar/home/c/ar-faplac'
      });
    } else if (q.includes('roble')) {
      return JSON.stringify({
        foundName: 'Roble Americano',
        brand: 'Arauco',
        dimensions: { width: 2600, height: 1830, thickness: 18 },
        grain: true,
        description: 'Clásico diseño de roble con vetas marcadas y naturales. Acabado Mate.',
        images: ['https://picsum.photos/seed/roble/800/600']
      });
    } else if (q.includes('blanco')) {
      return JSON.stringify({
        foundName: 'Blanco Nature',
        brand: 'Faplac',
        dimensions: { width: 2820, height: 1830, thickness: 15 },
        grain: false,
        description: 'Melamina blanca con acabado Nature, resistente y versátil para todo tipo de mobiliario.',
        images: ['https://picsum.photos/seed/blanco/800/600']
      });
    }

    return ''; // No data found
  }
);

// 4. Define the prompt that uses the tool and processes its output.
const autocompletePanelPrompt = ai.definePrompt({
  name: 'autocompletePanelPrompt',
  input: { schema: AdminPanelAutocompletionInputSchema },
  output: { schema: AdminPanelAutocompletionOutputSchema },
  tools: [autocompletePanelScraper],
  prompt: `You are an AI expert in construction materials and wooden panels, with deep knowledge of catalogs like Faplac (https://www.faplaconline.com.ar/home/c/ar-faplac), Arauco, and Masisa.

The user will provide a panel name or a partial description.
Your task is:
1. Use the 'autocompletePanelScraper' tool to find specific technical details (brand, dimensions, textures).
2. If the tool provides information, use it as the primary source.
3. If the tool returns nothing but you recognize the product as a standard item from Faplac or other major brands, use your internal knowledge to fill in standard industry values (e.g., Faplac panels are usually 2820x1830mm).
4. Structure everything into the 'AdminPanelAutocompletionOutput' schema.

Input Panel Name: {{{panelName}}}`,
});

// 5. Define the flow that orchestrates the prompt call.
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

// 6. Export the wrapper function and types.
export async function autocompletePanelDetails(
  input: AdminPanelAutocompletionInput
): Promise<AdminPanelAutocompletionOutput> {
  return adminPanelAutocompletionFlow(input);
}
