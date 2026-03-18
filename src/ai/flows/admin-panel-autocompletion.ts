'use server';
/**
 * @fileOverview This file defines a Genkit flow for autocompleting panel details based on a panel name.
 * It uses a generative AI model to process scraped data (simulated by a tool) and structure it into a defined schema.
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
  brand: z.string().optional().describe('The brand of the panel.'),
  width: z.number().optional().describe('The width of the panel in millimeters.'),
  height: z.number().optional().describe('The height of the panel in millimeters.'),
  thickness: z.number().optional().describe('The thickness of the panel in millimeters.'),
  hasGrain: z.boolean().optional().describe('Whether the panel has a grain pattern (vetas).'),
  description: z.string().optional().describe('A detailed description of the panel.'),
  images: z.array(z.string().url()).optional().describe('An array of image URLs for the panel.'),
  mainImage: z.string().url().optional().describe('The main image URL for the panel.'),
}).describe('Structured details for a panel, autocompleted from external sources.');
export type AdminPanelAutocompletionOutput = z.infer<typeof AdminPanelAutocompletionOutputSchema>;

// 3. Define a placeholder tool for the Cloud Function scraping.
// In a real application, this tool would call the actual Cloud Function endpoint,
// for example, via a REST API call.
const autocompletePanelScraper = ai.defineTool(
  {
    name: 'autocompletePanelScraper',
    description: 'Scrapes the internet or calls external APIs to find raw information about a panel based on its name.',
    inputSchema: z.object({
      query: z.string().describe('The name of the panel to search for.'),
    }),
    outputSchema: z.string().describe('Raw JSON string containing scraped data, or an empty string if no data is found.'),
  },
  async (input) => {
    // This is a placeholder implementation.
    // In a real scenario, this would call your Firebase Cloud Function, e.g.:
    // const response = await fetch('YOUR_CLOUD_FUNCTION_ENDPOINT', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ panelName: input.query }),
    // });
    // const data = await response.json();
    // return JSON.stringify(data);

    // Mock data for demonstration:
    if (input.query.toLowerCase().includes('roble')) {
      return JSON.stringify({
        foundName: 'Tablero Roble Claro Premium',
        brand: 'Arauco',
        dimensions: {
          width: 2500,
          height: 1830,
          thickness: 18,
        },
        grain: true,
        description: 'MDF melamínico de alta calidad con acabado en roble claro, ideal para muebles y revestimientos interiores.',
        images: [
          'https://example.com/roble-claro-premium-1.jpg',
          'https://example.com/roble-claro-premium-2.jpg',
        ],
      });
    } else if (input.query.toLowerCase().includes('blanco')) {
        return JSON.stringify({
            foundName: 'Tablero Melamínico Blanco',
            brand: 'Faplac',
            dimensions: {
                width: 2800,
                height: 2200,
                thickness: 15,
            },
            grain: false,
            description: 'MDF con melamina blanca, perfecto para proyectos de cocina y baño por su resistencia a la humedad.',
            images: [
                'https://example.com/melamina-blanca-1.jpg',
                'https://example.com/melamina-blanca-2.jpg',
            ],
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
  prompt: `You are an AI assistant specialized in finding and structuring information about wooden panels.
The user will provide you with a panel name.
Your task is to use the 'autocompletePanelScraper' tool to find raw information about this panel.
Then, you must structure the found data into the 'AdminPanelAutocompletionOutput' schema.

If the 'autocompletePanelScraper' tool returns an empty string or no relevant data, then you should return an object with all fields as undefined or empty arrays as specified by the output schema, indicating that no information was found.
Prioritize the 'foundName' from the scraper if available, otherwise use the original 'panelName' for the 'name' field in the output.
For images, if multiple are returned, pick the first one as 'mainImage'. If no images are found, both 'images' and 'mainImage' should be empty or undefined.
Convert dimensions (width, height, thickness) to numbers. Infer 'hasGrain' from the description or scraped data if not explicitly provided.

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
    return output!; // The prompt is designed to return the structured output.
  }
);

// 6. Export the wrapper function and types.
export async function autocompletePanelDetails(
  input: AdminPanelAutocompletionInput
): Promise<AdminPanelAutocompletionOutput> {
  return adminPanelAutocompletionFlow(input);
}
