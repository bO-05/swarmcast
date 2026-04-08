export interface ExaResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
}

export async function fetchUrlContent(url: string): Promise<{ title: string; text: string; publishedDate?: string }> {
  const apiKey = process.env["EXA_API_KEY"];
  if (!apiKey) throw new Error("EXA_API_KEY is not set");

  const response = await fetch("https://api.exa.ai/contents", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ids: [url],
      text: { maxCharacters: 8000 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Exa contents error: ${response.status} - ${errText}`);
  }

  const data = (await response.json()) as {
    results: Array<{
      title?: string;
      url: string;
      text?: string;
      publishedDate?: string;
    }>;
  };

  const result = data.results?.[0];
  if (!result?.text) throw new Error("No content extracted from URL");

  return {
    title: result.title || new URL(url).hostname,
    text: result.text,
    publishedDate: result.publishedDate,
  };
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
