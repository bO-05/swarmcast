export interface FactCheckItem {
  claim: string;
  status: "accurate" | "missing_context" | "misleading";
  note: string;
}

export interface FactCheckResult {
  objective_assessment: string;
  accuracy_rating: "high" | "medium" | "low";
  fact_check_items: FactCheckItem[];
}

export async function factCheckDocument(
  text: string,
): Promise<FactCheckResult> {
  const apiKey = process.env["PERPLEXITY_API_KEY"];
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY is not set");

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        {
          role: "system",
          content: `You are a professional fact-checker. Analyze the provided document and return a JSON fact-check report.
Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "objective_assessment": "brief overall assessment of the document's accuracy",
  "accuracy_rating": "high" | "medium" | "low",
  "fact_check_items": [
    {
      "claim": "specific claim from the document",
      "status": "accurate" | "missing_context" | "misleading",
      "note": "brief explanation"
    }
  ]
}
Include 3-5 fact_check_items covering the most important claims.`,
        },
        {
          role: "user",
          content: `Fact-check this document:\n\n${text.slice(0, 4000)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${errText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices[0].message.content;

  try {
    const cleanContent = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleanContent) as FactCheckResult;
  } catch {
    return {
      objective_assessment: content.slice(0, 300),
      accuracy_rating: "medium",
      fact_check_items: [],
    };
  }
}
