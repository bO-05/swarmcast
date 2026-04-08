import fs from "fs";
import path from "path";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io";

function getApiKey(): string {
  const key = process.env["ELEVENLABS_API_KEY"];
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  return key;
}

function mapAge(age: number): string {
  if (age <= 30) return "young";
  if (age <= 50) return "middle_aged";
  return "old";
}

function mapAccent(accent: string): string {
  const a = accent.toLowerCase();
  if (a.includes("british") || a.includes("uk") || a.includes("english"))
    return "british";
  if (a.includes("australian") || a.includes("aussie")) return "australian";
  if (a.includes("african")) return "african";
  if (a.includes("indian")) return "indian";
  if (a.includes("irish")) return "irish";
  return "american";
}

function buildSampleText(initialReaction: string): string {
  const words = initialReaction.split(/\s+/);
  if (words.length <= 80) return initialReaction;
  return words.slice(0, 75).join(" ") + "...";
}

export async function createPersonaVoice(persona: {
  gender: string;
  age: number;
  accent: string;
  initialReaction: string;
}): Promise<string> {
  const apiKey = getApiKey();
  const ageCategory = mapAge(persona.age);
  const accentValue = mapAccent(persona.accent);
  const textSample = buildSampleText(
    persona.initialReaction || "I have strong opinions about this announcement.",
  );

  const response = await fetch(
    `${ELEVENLABS_API_URL}/v1/voice-generation/generate-voice`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gender: persona.gender === "female" ? "female" : "male",
        age: ageCategory,
        accent: accentValue,
        accent_strength: 1.2,
        text: textSample,
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `ElevenLabs Voice Design error: ${response.status} - ${errText}`,
    );
  }

  const data = (await response.json()) as { voice_id: string };
  if (!data.voice_id) {
    throw new Error("No voice_id returned from Voice Design API");
  }
  return data.voice_id;
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
  const script = `${persona.personaName}, ${persona.age}, from ${persona.country}. ${persona.initialReaction} After seeing what people are actually saying — for example, "${exaTitle}" — ${shift}: ${persona.finalOpinion} What concerns me most is ${persona.keyConcern}.`;
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
          stability: 0.5,
          similarity_boost: 0.8,
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
