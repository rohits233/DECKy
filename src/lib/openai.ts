import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateSlideContent(prompt: string, context: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a consultant presentation expert. Generate clear, professional slide content.',
      },
      {
        role: 'user',
        content: `Context: ${context}\n\nGenerate slide content for: ${prompt}`,
      },
    ],
  });

  return response.choices[0].message.content;
}
