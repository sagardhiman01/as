export const callLLMStream = async (provider, apiKey, systemPrompt, messages, modelName, onChunk) => {
  if (provider === 'openai') {
    await streamOpenAICompatible('/api/openai/v1/chat/completions', apiKey, systemPrompt, messages, modelName || 'gpt-4o', onChunk);
  } else if (provider === 'nvidia') {
    await streamOpenAICompatible('/api/nvidia/v1/chat/completions', apiKey, systemPrompt, messages, modelName || 'deepseek-ai/deepseek-v4-pro', onChunk);
  } else if (provider === 'gemini') {
    // Basic fallback for Gemini (doesn't use streaming yet in this simple version, just calls normally and fires onChunk)
    const reply = await callGemini(apiKey, systemPrompt, messages, modelName || 'gemini-1.5-pro');
    onChunk(reply);
  } else {
    throw new Error('Unsupported provider');
  }
};

const streamOpenAICompatible = async (baseUrl, apiKey, systemPrompt, messages, modelName, onChunk) => {
  const formattedMessages = [];
  if (systemPrompt && systemPrompt.trim() !== '') {
    formattedMessages.push({ role: 'system', content: systemPrompt });
  }
  formattedMessages.push(...messages);

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: formattedMessages,
      temperature: 0.6,
      top_p: 0.95,
      max_tokens: 16384,
      stream: true
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API Error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    
    // Keep the last partial line in the buffer
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      
      if (trimmed.startsWith('data: ')) {
        try {
          const data = JSON.parse(trimmed.substring(6));
          if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
            onChunk(data.choices[0].delta.content);
          }
        } catch (e) {
          // ignore parse errors for partial chunks
        }
      }
    }
  }
};

const callGemini = async (apiKey, systemPrompt, messages, modelName) => {
  const formattedContents = messages.map(msg => {
    let parts = [];
    if (typeof msg.content === 'string') {
      parts = [{ text: msg.content }];
    } else if (Array.isArray(msg.content)) {
      parts = msg.content.map(item => {
        if (item.type === 'text') return { text: item.text };
        if (item.type === 'image_url') {
          const url = item.image_url.url;
          const [header, base64Data] = url.split(',');
          const mimeType = header.split(':')[1].split(';')[0];
          return { inlineData: { mimeType, data: base64Data } };
        }
        return null;
      }).filter(Boolean);
    }
    return {
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts
    };
  });

  const payload = {
    contents: formattedContents,
  };

  // Add system instruction if provided
  if (systemPrompt && systemPrompt.trim() !== '') {
    payload.systemInstruction = {
      role: 'user',
      parts: [{ text: systemPrompt }]
    };
  }

  const url = `/api/gemini/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API Error: ${response.status}`);
  }

  const data = await response.json();
  if (data.candidates && data.candidates.length > 0) {
    return data.candidates[0].content.parts[0].text;
  }
  return 'No response generated.';
};
