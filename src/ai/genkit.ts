import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {GEMINI_MODELS, GEMINI_THINKING_LEVELS} from '@/ai/gemini.models';

export const ai = genkit({
  plugins: [googleAI({apiVersion: 'v1beta'})],
  model: GEMINI_MODELS.main,
});

export {GEMINI_MODELS, GEMINI_THINKING_LEVELS};
