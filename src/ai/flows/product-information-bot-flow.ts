'use server';
/**
 * @fileOverview An AI assistant flow that answers user questions about a specific product.
 *
 * - getProductInformation - A function that interacts with the AI to answer product-related questions.
 * - ProductInformationBotInput - The input type for the getProductInformation function.
 * - ProductInformationBotOutput - The return type for the getProductInformation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProductInformationBotInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  productDescription: z
    .string()
    .describe('A detailed description of the product.'),
  availableSizes: z
    .array(z.string())
    .optional()
    .describe('A list of available sizes for the product.'),
  availableColors: z
    .array(z.string())
    .optional()
    .describe('A list of available colors for the product.'),
  price: z.number().describe('The price of the product.'),
  userQuestion: z
    .string()
    .describe('The user\'s question about the product.'),
});
export type ProductInformationBotInput = z.infer<
  typeof ProductInformationBotInputSchema
>;

const ProductInformationBotOutputSchema = z.object({
  answer: z
    .string()
    .describe(
      'The AI\'s answer to the user\'s question about the product. Provide a concise and helpful answer based on the provided product details.'
    ),
});
export type ProductInformationBotOutput = z.infer<
  typeof ProductInformationBotOutputSchema
>;

export async function getProductInformation(
  input: ProductInformationBotInput
): Promise<ProductInformationBotOutput> {
  return productInformationBotFlow(input);
}

const productInformationPrompt = ai.definePrompt({
  name: 'productInformationPrompt',
  input: {schema: ProductInformationBotInputSchema},
  output: {schema: ProductInformationBotOutputSchema},
  prompt: `Eres un asistente útil y experto en productos del Club León. Tu objetivo es responder las preguntas del usuario de manera concisa y precisa basándote estrictamente en la información del producto proporcionada.

--- INFORMACIÓN DEL PRODUCTO ---
Nombre del producto: {{{productName}}}
Descripción: {{{productDescription}}}
Precio: $ {{{price}}}
Tallas disponibles: {{#if availableSizes}}{{{availableSizes}}}{{else}}No especificado{{/if}}
Colores disponibles: {{#if availableColors}}{{{availableColors}}}{{else}}No especificado{{/if}}
--------------------------------

Pregunta del usuario: "{{{userQuestion}}}"

Respuesta:`,
});

const productInformationBotFlow = ai.defineFlow(
  {
    name: 'productInformationBotFlow',
    inputSchema: ProductInformationBotInputSchema,
    outputSchema: ProductInformationBotOutputSchema,
  },
  async input => {
    const {output} = await productInformationPrompt(input);
    return output!;
  }
);
