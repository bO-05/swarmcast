const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

function getApiKey(): string {
  const key = process.env["MISTRAL_API_KEY"];
  if (!key) throw new Error("MISTRAL_API_KEY is not set");
  return key;
}

export interface KeywordsResult {
  keywords: string;
  topic_summary: string;
}

export interface PersonaRaw {
  persona_name: string;
  persona_type: string;
  background: string;
  mbti: string;
  age: number;
  country: string;
  accent: string;
  gender: string;
  voice_style: string;
  activity_level: number;
  influence_weight: number;
  sentiment_bias: number;
  initial_reaction: string;
  final_opinion: string;
  initial_sentiment: number;
  final_sentiment: number;
  belief_state: { stance: number; confidence: number };
  key_concern: string;
  would_share: boolean;
  platform_preference: string;
}

export interface SwarmSummaryRaw {
  avg_sentiment: number;
  dominant_emotion: string;
  risk_level: string;
  consensus_forming: boolean;
  key_themes: string[];
  narrative_fractures: string[];
  viral_potential: number;
  swarm_summary_paragraph: string;
  market_question: string;
  market_probability: number;
}

export async function extractKeywords(
  title: string,
  text: string,
): Promise<KeywordsResult> {
  const response = await fetch(MISTRAL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You are a topic extraction assistant. Extract keywords and a brief topic summary from the document. Return JSON with fields: "keywords" (string, comma-separated keywords), "topic_summary" (string, 1-2 sentences).',
        },
        {
          role: "user",
          content: `Title: ${title}\n\nDocument:\n${text.slice(0, 3000)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Mistral API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return JSON.parse(data.choices[0].message.content) as KeywordsResult;
}

export async function generatePersonas(
  title: string,
  text: string,
  exaResults: Array<{ title: string; snippet: string }>,
  factCheckSummary: string,
): Promise<PersonaRaw[]> {
  const exaContext = exaResults
    .slice(0, 8)
    .map((r, i) => `[${i + 1}] "${r.title}": ${r.snippet}`)
    .join("\n");

  const systemPrompt = `You are a persona swarm generator. Generate exactly 25 distinct personas who would react to this document.

Rules:
- Exactly 25 personas in the "personas" array
- Diverse persona types: skeptic, enthusiast, neutral, critic, concerned, influencer, institutional
- Ages 18-72, diverse MBTI types, various countries and accents
- Each persona MUST include: accent (e.g. "British", "American", "Indian", "Australian", "African", "Irish", "Brazilian Portuguese"), gender ("male" or "female"), voice_style (e.g. "calm and measured", "rapid and energetic", "warm and reflective")
- final_sentiment within ±0.3 of initial_sentiment normally; up to ±0.5 if fact_check issues are severe
- belief_state.confidence lower when many fact-check issues found
- Approximately 30% of personas with would_share = true
- At most 6 personas with |final_sentiment| > 0.7
- influence_weight between 0.5 and 3.0
- activity_level between 0.0 and 1.0
- sentiment values between -1.0 and 1.0

Return JSON with a single key "personas" containing the array.`;

  const userPrompt = `Title: ${title}

Document:
${text.slice(0, 4000)}

Web Discourse Context:
${exaContext}

Fact-Check Summary:
${factCheckSummary}

Generate exactly 25 diverse personas who would react to this announcement.`;

  const response = await fetch(MISTRAL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-medium-latest",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Mistral API error: ${response.status} - ${errText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const parsed = JSON.parse(data.choices[0].message.content) as {
    personas: PersonaRaw[];
  };
  return parsed.personas || [];
}

export async function generateSwarmSummary(
  personas: PersonaRaw[],
): Promise<SwarmSummaryRaw> {
  const personaSummaries = personas
    .slice(0, 15)
    .map(
      (p) =>
        `${p.persona_name} (${p.persona_type}, ${p.country}): sentiment ${p.final_sentiment.toFixed(2)}, concern: ${p.key_concern}`,
    )
    .join("\n");

  const response = await fetch(MISTRAL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-medium-latest",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a swarm analytics engine. Analyze the persona reactions and produce a swarm summary.
Return JSON with: avg_sentiment (number -1 to 1), dominant_emotion (string), risk_level ("low"|"medium"|"high"), consensus_forming (boolean), key_themes (array of 3 strings), narrative_fractures (array of 2 strings), viral_potential (number 0-1), swarm_summary_paragraph (string, 2-3 sentences), market_question (yes/no style string), market_probability (number 0-1).`,
        },
        {
          role: "user",
          content: `Persona reactions:\n${personaSummaries}\n\nGenerate the swarm summary.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Mistral API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return JSON.parse(data.choices[0].message.content) as SwarmSummaryRaw;
}
