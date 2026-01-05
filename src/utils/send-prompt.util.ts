import { OpenRouter } from '@openrouter/sdk';

export async function sendPrompt(openrouter: OpenRouter): Promise<string> {
  const response = await openrouter.chat.send({
    model: 'mistralai/mistral-7b-instruct:free',
    maxTokens: 100,
    messages: [
      {
        role: 'system',
        content:
          'Это НЕ поздравление с праздником. Это обычное ежедневное тёплое сообщение. Никаких слов: праздник, с праздником, желаю, поздравляю. Один короткий текст от первого лица (я). 2–3 предложения. Спокойный, живой тон. Без пафоса. Без списков и пояснений. Верни ТОЛЬКО обычный текст. Запрещены любые виды разметки: HTML, Markdown, BBCode.',
      },
      {
        role: 'user',
        content: 'Тёплое поздравление для девушки (Ася)',
      },
    ],
  });
  const text = response.choices[0]?.message?.content;
  if (!text || typeof text !== 'string') return '';
  return text;
}
