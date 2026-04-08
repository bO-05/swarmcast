import fs from "fs";
import path from "path";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io";

function getApiKey(): string {
  const key = process.env["ELEVENLABS_API_KEY"];
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  return key;
}

interface VoiceEntry {
  id: string;
  name: string;
  gender: "male" | "female" | "neutral";
  accent: string;
  age: "young" | "middle_aged" | "old";
  desc?: string;
}

const VOICE_LIBRARY: VoiceEntry[] = [
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", gender: "male", accent: "american", age: "middle_aged", desc: "classy" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "female", accent: "american", age: "young", desc: "professional" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", gender: "female", accent: "american", age: "young", desc: "sassy" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", gender: "male", accent: "australian", age: "young", desc: "hyped" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", gender: "male", accent: "british", age: "middle_aged", desc: "mature" },
  { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum", gender: "male", accent: "american", age: "middle_aged" },
  { id: "SAz9YHcvj6GT2YYXdXww", name: "River", gender: "neutral", accent: "american", age: "middle_aged", desc: "calm" },
  { id: "SOYHLrjzK2X1ezoPC6cr", name: "Harry", gender: "male", accent: "american", age: "young", desc: "rough" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", gender: "male", accent: "american", age: "young", desc: "confident" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", gender: "female", accent: "british", age: "middle_aged", desc: "professional" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", gender: "female", accent: "american", age: "middle_aged", desc: "upbeat" },
  { id: "bIHbv24MWmeRgasZH58o", name: "Will", gender: "male", accent: "american", age: "young", desc: "chill" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", gender: "female", accent: "american", age: "young", desc: "cute" },
  { id: "cjVigY5qzO86Huf0OWal", name: "Eric", gender: "male", accent: "american", age: "middle_aged", desc: "classy" },
  { id: "hpp4J3VqNfWAUOO0d1Us", name: "Bella", gender: "female", accent: "american", age: "middle_aged", desc: "professional" },
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris", gender: "male", accent: "american", age: "middle_aged", desc: "casual" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", gender: "male", accent: "american", age: "middle_aged", desc: "classy" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", gender: "male", accent: "british", age: "middle_aged", desc: "formal" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", gender: "female", accent: "british", age: "middle_aged", desc: "confident" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", gender: "male", accent: "american", age: "middle_aged" },
  { id: "pqHfZKP75CvOlQylNhV4", name: "Bill", gender: "male", accent: "american", age: "old", desc: "crisp" },
  { id: "4zjKAnpCZxe1fKlOWFYx", name: "Lizzy", gender: "female", accent: "british", age: "old" },
  { id: "WaRZW90RtggivSBUviSm", name: "Shadrach", gender: "male", accent: "african", age: "young" },
  { id: "RbNgJzKAV7jpYJNtCBpj", name: "Citra", gender: "female", accent: "standard", age: "young", desc: "calm" },
];

function normalizeAccent(accent: string): string {
  const a = accent.toLowerCase();
  if (a.includes("british") || a.includes("uk") || a.includes("english")) return "british";
  if (a.includes("australian") || a.includes("aussie")) return "australian";
  if (a.includes("african") || a.includes("nigerian") || a.includes("south african")) return "african";
  if (a.includes("indian") || a.includes("hindi")) return "standard";
  if (a.includes("irish")) return "british";
  if (a.includes("canadian")) return "american";
  if (a.includes("french") || a.includes("german") || a.includes("portuguese") || a.includes("spanish")) return "american";
  return "american";
}

function normalizeAge(age: number): "young" | "middle_aged" | "old" {
  if (age <= 33) return "young";
  if (age <= 55) return "middle_aged";
  return "old";
}

function matchScore(voice: VoiceEntry, gender: string, accent: string, ageCategory: "young" | "middle_aged" | "old"): number {
  let score = 0;
  const voiceGender = voice.gender === "neutral" ? gender : voice.gender;
  if (voiceGender === gender) score += 10;
  if (voice.accent === accent) score += 5;
  if (voice.age === ageCategory) score += 3;
  return score;
}

export function selectVoicesForPersonas(
  personas: Array<{ id: number; gender: string | null; accent: string | null; age: number | null }>,
): Map<number, string> {
  const assignments = new Map<number, string>();
  const usedVoiceIds = new Set<string>();

  for (const persona of personas) {
    const gender = (persona.gender ?? "male").toLowerCase();
    const accentNorm = normalizeAccent(persona.accent ?? "American");
    const ageCategory = normalizeAge(persona.age ?? 30);

    const candidates = VOICE_LIBRARY
      .filter((v) => !usedVoiceIds.has(v.id))
      .map((v) => ({ voice: v, score: matchScore(v, gender, accentNorm, ageCategory) }))
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      const fallback = VOICE_LIBRARY.find((v) => !usedVoiceIds.has(v.id)) ?? VOICE_LIBRARY[0];
      assignments.set(persona.id, fallback.id);
      usedVoiceIds.add(fallback.id);
    } else {
      const best = candidates[0].voice;
      assignments.set(persona.id, best.id);
      usedVoiceIds.add(best.id);
    }
  }

  return assignments;
}

function buildVoiceScript(
  persona: {
    personaName: string;
    age: number;
    country: string;
    initialReaction: string;
    finalOpinion: string;
    keyConcern: string;
    finalSentiment: number;
  },
  exaTitle: string,
): string {
  const shift =
    Math.abs(persona.finalSentiment) > 0.5
      ? "I feel even more certain"
      : "my view has shifted";
  const name = persona.personaName || "A community member";
  const reaction = persona.initialReaction || "I have strong thoughts on this.";
  const opinion = persona.finalOpinion || "My perspective remains unchanged.";
  const concern = persona.keyConcern || "the broader implications";
  const script = `${name}, ${persona.age}, from ${persona.country}. ${reaction} After seeing what people are actually saying — for example, "${exaTitle}" — ${shift}: ${opinion} What concerns me most is ${concern}.`;
  const words = script.split(/\s+/);
  if (words.length <= 100) return script;
  return words.slice(0, 95).join(" ") + ".";
}

export async function generatePersonaAudio(
  persona: {
    id: number;
    voiceId: string;
    personaName: string;
    age: number;
    country: string;
    initialReaction: string;
    finalOpinion: string;
    keyConcern: string;
    finalSentiment: number;
  },
  analysisId: string,
  exaTitle: string,
): Promise<string> {
  const apiKey = getApiKey();

  const script = buildVoiceScript(persona, exaTitle);

  const response = await fetch(
    `${ELEVENLABS_API_URL}/v1/text-to-speech/${persona.voiceId}`,
    {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs TTS error: ${response.status} - ${errText}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const dir = path.join(process.cwd(), "static", "audio", analysisId);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${persona.id}.mp3`);
  fs.writeFileSync(filePath, audioBuffer);

  return `/api/static/audio/${analysisId}/${persona.id}.mp3`;
}
