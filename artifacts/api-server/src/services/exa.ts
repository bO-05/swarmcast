export interface ExaResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
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
