export async function runExpertStream(
  systemInstruction: string,
  prompt: string,
  onChunk: (text: string) => void,
  model = "gemini-3.5-flash"
): Promise<string> {
  const response = await fetch("/api/generate-stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction,
      prompt,
      model,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }

  const decoder = new TextDecoder("utf-8");
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const rawData = line.slice(6).trim();
        if (!rawData) continue;
        try {
          const parsed = JSON.parse(rawData);
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.text) {
            fullText += parsed.text;
            onChunk(parsed.text);
          }
        } catch (e: any) {
          if (e.message.startsWith("Stream interrupted") || e.message.startsWith("Generation failed")) {
            throw e;
          }
        }
      }
    }
  }

  return fullText;
}

export async function expandIdeas(
  genres: string[],
  themes: string,
  aim: string
): Promise<{ genres: string[]; themes: string; aim: string }> {
  const response = await fetch("/api/expand-ideas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ genres, themes, aim }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Expansion failed");
  }

  return response.json();
}
