export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export function getLlmConfig() {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const useGroq = Boolean(groqKey);
  const apiKey = groqKey || openaiKey;
  if (!apiKey) return null;

  return {
    provider: 'openai_compat' as const,
    apiKey,
    model: useGroq
      ? process.env.GROQ_CHAT_MODEL || 'llama-3.3-70b-versatile'
      : process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    baseUrl: useGroq
      ? process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1'
      : process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  };
}

async function chatOpenAiCompat(
  config: NonNullable<ReturnType<typeof getLlmConfig>>,
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<{ content: string } | { error: string }> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: options?.maxTokens ?? 1200,
      temperature: options?.temperature ?? 0.4,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return { error: `AI API error: ${response.status} ${errText.slice(0, 200)}` };
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content as string | undefined;
  if (!content) return { error: 'No response from AI model.' };
  return { content: content.trim() };
}

async function chatGemini(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<{ content: string } | { error: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: 'GEMINI_API_KEY not configured.' };

  const model = process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash';
  const system = messages.find((m) => m.role === 'system')?.content;
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: options?.maxTokens ?? 1200,
      temperature: options?.temperature ?? 0.4,
    },
  };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    return { error: `Gemini API error: ${response.status} ${errText.slice(0, 200)}` };
  }

  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
  if (!text) return { error: 'No response from Gemini.' };
  return { content: text.trim() };
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<{ content: string } | { error: string }> {
  const config = getLlmConfig();
  if (config) {
    const result = await chatOpenAiCompat(config, messages, options);
    if (!('error' in result)) return result;
    if (process.env.GEMINI_API_KEY) {
      const gemini = await chatGemini(messages, options);
      if (!('error' in gemini)) return gemini;
      return { error: `${result.error} (Gemini fallback: ${gemini.error})` };
    }
    return result;
  }

  if (process.env.GEMINI_API_KEY) {
    return chatGemini(messages, options);
  }

  return {
    error: 'GROQ_API_KEY or GEMINI_API_KEY is not configured. Add one to enable AI features.',
  };
}
