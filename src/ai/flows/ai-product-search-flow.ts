'use server';
/**
 * @fileOverview This file implements an AI-powered product search flow for the Club León e-commerce store.
 *
 * - aiProductSearch - A function that processes a natural language query to extract product search parameters.
 * - AiProductSearchInput - The input type for the aiProductSearch function.
 * - AiProductSearchOutput - The return type for the aiProductSearch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiProductSearchInputSchema = z.object({
  userQuery: z.string().describe('The natural language query from the user.'),
});
export type AiProductSearchInput = z.infer<typeof AiProductSearchInputSchema>;

const AiProductSearchOutputSchema = z.object({
  category: z
    .enum([
      'jersey',
      'camiseta',
      'chamarra',
      'gorra',
      'accesorio',
      'coleccionable',
      'calzado',
      'otro',
    ])
    .optional()
    .describe('The product category inferred from the query.'),
  color: z
    .enum(['verde', 'amarillo', 'negro', 'blanco', 'gris', 'azul', 'rojo', 'otro'])
    .optional()
    .describe('The color of the product.'),
  size: z
    .enum(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Unitalla', 'otro'])
    .optional()
    .describe('The size of the product.'),
  gender: z
    .enum(['hombre', 'mujer', 'niño', 'unisex', 'otro'])
    .optional()
    .describe('The target gender for the product.'),
  isNew: z
    .boolean()
    .optional()
    .describe('Whether the user is specifically looking for new arrivals.'),
  isOffer: z
    .boolean()
    .optional()
    .describe('Whether the user is specifically looking for products on sale/promotion.'),
  keywords: z
    .array(z.string())
    .optional()
    .describe('Additional keywords from the query that dont fit predefined categories.'),
  originalQuery: z.string().describe('The original user query.'),
});
export type AiProductSearchOutput = z.infer<typeof AiProductSearchOutputSchema>;

export async function aiProductSearch(
  input: AiProductSearchInput
): Promise<AiProductSearchOutput> {
  return aiProductSearchFlow(input);
}

const productSearchPrompt = ai.definePrompt({
  name: 'productSearchPrompt',
  input: {schema: AiProductSearchInputSchema},
  output: {schema: AiProductSearchOutputSchema},
  prompt: `Eres un asistente inteligente para el buscador de una tienda e-commerce del Club León.
Tu tarea es analizar la consulta del usuario en lenguaje natural y extraer los parámetros de búsqueda relevantes en formato JSON.

Aquí tienes los posibles atributos de los productos y sus valores:
- Categorías: 'jersey', 'camiseta', 'chamarra', 'gorra', 'accesorio', 'coleccionable', 'calzado', 'otro' (para cualquier otra categoría no listada)
- Colores: 'verde', 'amarillo', 'negro', 'blanco', 'gris', 'azul', 'rojo', 'otro' (para cualquier otro color no listado)
- Tallas: 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'Unitalla', 'otro' (para cualquier otra talla no listada o números de calzado, por ejemplo)
- Género: 'hombre', 'mujer', 'niño', 'unisex', 'otro'
- Novedad: Si el usuario busca productos "nuevos" o de "nueva colección", establece 'isNew' en true.
- Promoción/Oferta: Si el usuario busca "ofertas", "descuentos" o "promociones", establece 'isOffer' en true.
- Keywords: Cualquier otra palabra clave relevante que no se ajuste a los campos anteriores debe ir en el array 'keywords'.

Si un parámetro no se menciona en la consulta, o si no puedes inferir un valor claro, no incluyas esa propiedad en el JSON de salida, excepto 'originalQuery' que siempre debe estar presente.
Asegúrate de que la salida sea un objeto JSON válido que solo contenga los campos definidos en el esquema.

La consulta del usuario es: "{{{userQuery}}}"
`,
});

const aiProductSearchFlow = ai.defineFlow(
  {
    name: 'aiProductSearchFlow',
    inputSchema: AiProductSearchInputSchema,
    outputSchema: AiProductSearchOutputSchema,
  },
  async (input) => {
    const {output} = await productSearchPrompt(input);
    // Ensure originalQuery is always present in the output, even if the prompt somehow misses it.
    return { ...output!, originalQuery: input.userQuery };
  }
);
