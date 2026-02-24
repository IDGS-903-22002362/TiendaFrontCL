'use server';

import { getProductInformation } from '@/ai/flows/product-information-bot-flow';
import type { Product } from '@/lib/types';

export async function askQuestion(
  product: Product,
  userQuestion: string
): Promise<string> {
  try {
    const result = await getProductInformation({
      productName: product.name,
      productDescription: product.description,
      availableSizes: product.sizes,
      availableColors: product.colors,
      price: product.price,
      userQuestion: userQuestion,
    });
    return result.answer;
  } catch (error) {
    console.error('Error getting product information from AI:', error);
    return 'Lo siento, no pude procesar tu pregunta en este momento. Por favor, intenta de nuevo más tarde.';
  }
}
