export interface ExaResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
}

export async function fetchUrlContent(url: string): Promise<{ title: string; text: string; publishedDate?: string }> {
  // Strip protocol then prepend Jina Reader prefix for reliable content extraction
  const stripped = url.replace(/^https?:\/\//, "");
  const jinaUrl = `https://r.jina.ai/${stripped}`;

  const response = await fetch(jinaUrl, {
    headers: {
      Accept: "text/plain",
    },
  });

  if (!response.ok) {
    throw new Error(`Jina Reader error: ${response.status} - ${response.statusText}`);
  }

  const text = await response.text();
  if (!text || text.trim().length === 0) throw new Error("No content extracted from URL");

  // Jina returns markdown — extract the title from the first heading if present
  const titleMatch = text.match(/^Title:\s*(.+)$/m) ?? text.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;

  // Trim to ~8000 chars to stay within LLM context
  const trimmedText = text.length > 8000 ? text.slice(0, 8000) + "…" : text;

  return { title, text: trimmedText };
}

export async function searchDiscourse(keywords: string): Promise<ExaResult[]> {
  const apiKey = process.env["EXA_API_KEY"];
  if (!apiKey) throw new Error("EXA_API_KEY is not set");

  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: keywords,
      type: "neural",
      numResults: 8,
      contents: {
        text: { maxCharacters: 500 },
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Exa API error: ${response.status} - ${errText}`);
  }

  const data = (await response.json()) as {
    results: Array<{
      title?: string;
      url: string;
      text?: string;
      publishedDate?: string;
    }>;
  };

  return (data.results || []).map((r) => ({
    title: r.title || "Untitled",
    url: r.url,
    snippet: r.text || "",
    publishedDate: r.publishedDate,
  }));
}
