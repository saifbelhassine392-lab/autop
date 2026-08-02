import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Initialisation du client Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Fonction pour obtenir le modèle
export function getGeminiModel(modelName: string = 'gemini-1.5-flash'): GenerativeModel {
  return genAI.getGenerativeModel({ model: modelName });
}

// Fonction générique pour générer du texte
export async function generateText(prompt: string, modelName: string = 'gemini-1.5-flash'): Promise<string> {
  try {
    const model = getGeminiModel(modelName);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Erreur lors de la génération de texte avec Gemini:', error);
    throw new Error('Erreur lors de la génération de texte');
  }
}

// Fonction pour générer du texte avec un système prompt
export async function generateTextWithSystemPrompt(
  systemPrompt: string,
  userPrompt: string,
  modelName: string = 'gemini-1.5-flash'
): Promise<string> {
  try {
    const model = getGeminiModel(modelName);
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userPrompt }
    ]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Erreur lors de la génération de texte avec Gemini:', error);
    throw new Error('Erreur lors de la génération de texte');
  }
}

// Fonction pour générer du texte en mode chat (avec historique)
export async function generateChatResponse(
  messages: Array<{ role: string; content: string }>,
  modelName: string = 'gemini-1.5-flash'
): Promise<string> {
  try {
    const model = getGeminiModel(modelName);
    const chat = model.startChat({
      history: messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }))
    });
    
    const result = await chat.sendMessage(messages[messages.length - 1].content);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Erreur lors de la génération de réponse chat avec Gemini:', error);
    throw new Error('Erreur lors de la génération de réponse chat');
  }
}
