import fs from "fs";
import path from "path";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io";
const NARRATOR_VOICE_ID = "onwK4e9ZLuTAKqWW03F9";

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

function mbtiExtraversionCoeff(mbti: string): number {
  return (mbti ?? "").toUpperCase().startsWith("E") ? 1.0 : 0.6;
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

export interface AudioResult {
  audioUrl: string;
  audioPath: string;
  script: string;
}

export interface PronunciationDictLocator {
  dictionaryId: string;
  versionId: string;
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
    influenceWeight?: number;
    beliefConfidence?: number;
    mbti?: string;
  },
  analysisId: string,
  exaTitle: string,
  pronunciationDictLocator?: PronunciationDictLocator,
): Promise<AudioResult> {
  const apiKey = getApiKey();
  const script = buildVoiceScript(persona, exaTitle);

  const extCoeff = mbtiExtraversionCoeff(persona.mbti ?? "I");
  const style = Math.min(Math.abs(persona.finalSentiment) * extCoeff, 1.0);
  const stability = Math.max(0.3, Math.min(0.9, persona.beliefConfidence ?? 0.5));
  const similarity_boost = Math.max(0.5, Math.min(1.0, (persona.influenceWeight ?? 1.5) / 3.0));

  const body: Record<string, unknown> = {
    text: script,
    model_id: "eleven_multilingual_v2",
    voice_settings: {
      stability,
      similarity_boost,
      style,
      use_speaker_boost: true,
    },
  };

  if (pronunciationDictLocator) {
    body.pronunciation_dictionary_locators = [
      {
        pronunciation_dictionary_id: pronunciationDictLocator.dictionaryId,
        version_id: pronunciationDictLocator.versionId,
      },
    ];
  }

  const response = await fetch(
    `${ELEVENLABS_API_URL}/v1/text-to-speech/${persona.voiceId}`,
    {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(body),
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

  return {
    audioUrl: `/api/static/audio/${analysisId}/${persona.id}.mp3`,
    audioPath: filePath,
    script,
  };
}

export async function designVoiceForPersona(
  persona: {
    personaName: string;
    gender: string;
    age: number;
    country: string;
    accent: string;
    voiceStyle: string;
    personaType: string;
    background: string;
  },
): Promise<string | null> {
  const apiKey = getApiKey();

  const genderLabel = (persona.gender ?? "").toLowerCase() === "female" ? "female" : "male";
  const ageLabel = persona.age <= 33 ? "young" : persona.age <= 55 ? "middle-aged" : "older";
  const description = `A ${ageLabel} ${genderLabel} from ${persona.country} with a ${persona.accent} accent. Voice style: ${persona.voiceStyle}. Persona archetype: ${persona.personaType}. Background: ${(persona.background ?? "").slice(0, 100)}`;

  const sampleText = `My perspective on this matter is clear, and I think it deserves serious consideration from everyone involved.`;

  try {
    const genRes = await fetch(`${ELEVENLABS_API_URL}/v1/voice-generation/generate-voice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        voice_description: description,
        text: sampleText,
      }),
    });

    if (!genRes.ok) return null;

    const genData = (await genRes.json()) as {
      previews?: Array<{ generated_voice_id: string }>;
    };

    const generatedVoiceId = genData.previews?.[0]?.generated_voice_id;
    if (!generatedVoiceId) return null;

    const createRes = await fetch(`${ELEVENLABS_API_URL}/v1/voice-generation/create-voice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        voice_name: `SC_${persona.personaName.replace(/\s+/g, "_").slice(0, 20)}`,
        voice_description: description,
        generated_voice_id: generatedVoiceId,
        labels: {
          use_case: "swarmcast",
          persona_type: persona.personaType,
        },
      }),
    });

    if (!createRes.ok) return null;

    const createData = (await createRes.json()) as { voice_id?: string };
    return createData.voice_id ?? null;
  } catch {
    return null;
  }
}

function buildPlsXml(aliases: Array<{ grapheme: string; alias: string }>): string {
  const lexemes = aliases
    .map(
      ({ grapheme, alias }) =>
        `  <lexeme>\n    <grapheme>${grapheme}</grapheme>\n    <alias>${alias}</alias>\n  </lexeme>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<lexicon version="1.0"
  xmlns="http://www.w3.org/2005/01/pronunciation-lexicon"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.w3.org/2005/01/pronunciation-lexicon http://www.w3.org/TR/2007/CR-pronunciation-lexicon-20071212/pls.xsd"
  alphabet="ipa"
  xml:lang="en-US">
${lexemes}
</lexicon>`;
}

const DIGIT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

function spellDigits(str: string): string {
  return str.replace(/\d/g, (d) => " " + (DIGIT_WORDS[parseInt(d)] ?? d));
}

function extractAcronymAliases(keywords: string): Array<{ grapheme: string; alias: string }> {
  const terms = keywords.split(",").map((t) => t.trim());
  const results: Array<{ grapheme: string; alias: string }> = [];
  const seen = new Set<string>();

  for (const term of terms) {
    const upper = term.toUpperCase();
    if (/^[A-Z]{2,6}(-\d)?$/.test(upper) && !seen.has(upper)) {
      seen.add(upper);
      const base = upper.replace(/-\d$/, "");
      const suffix = upper.match(/-(\d)$/);
      const letters = base.split("").join(" ");
      const alias = suffix
        ? `${letters} ${DIGIT_WORDS[parseInt(suffix[1])] ?? suffix[1]}`
        : letters;
      results.push({ grapheme: upper, alias });
    }
  }

  return results;
}

function extractProperNounAliases(
  title: string,
  content: string,
): Array<{ grapheme: string; alias: string }> {
  const results: Array<{ grapheme: string; alias: string }> = [];
  const seen = new Set<string>();

  const allText = `${title} ${content.slice(0, 2000)}`;
  const tokens = allText.match(/[\w][\w'./-]*/g) ?? [];

  for (const token of tokens) {
    if (seen.has(token) || token.length < 2) continue;

    const alphanumMixed = /^[A-Za-z]+\d+/.test(token) || /^\d+[A-Za-z]+/.test(token);
    const camelCase = /[a-z][A-Z]/.test(token) || /[A-Z]{2,}[a-z]/.test(token);
    const slashedVersion = /^v?\d+\.\d+/.test(token);

    if (alphanumMixed || camelCase || slashedVersion) {
      seen.add(token);

      if (slashedVersion) {
        const alias = token.replace(/\./g, " point ").replace(/\d/g, (d) => DIGIT_WORDS[parseInt(d)] ?? d);
        results.push({ grapheme: token, alias: alias.trim() });
        continue;
      }

      if (/^[A-Z0-9-]{2,}$/.test(token) && /\d/.test(token)) {
        const letters = token.replace(/[A-Z]/g, (l) => l + " ").replace(/-/g, " ");
        const alias = spellDigits(letters).replace(/\s+/g, " ").trim();
        results.push({ grapheme: token, alias });
        continue;
      }

      const camelExpanded = token
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
      const alias = spellDigits(camelExpanded).replace(/\s+/g, " ").trim();
      if (alias !== token) {
        results.push({ grapheme: token, alias });
      }
    }
  }

  return results.slice(0, 20);
}

export async function createPronunciationDictionary(
  name: string,
  keywords: string,
  title = "",
  content = "",
): Promise<PronunciationDictLocator | null> {
  const apiKey = getApiKey();
  const acronymAliases = extractAcronymAliases(keywords);
  const properNounAliases = extractProperNounAliases(title, content);

  const seenGraphemes = new Set<string>();
  const aliases: Array<{ grapheme: string; alias: string }> = [];
  for (const a of [...acronymAliases, ...properNounAliases]) {
    if (!seenGraphemes.has(a.grapheme)) {
      seenGraphemes.add(a.grapheme);
      aliases.push(a);
    }
  }

  if (aliases.length === 0) return null;

  const plsXml = buildPlsXml(aliases);

  try {
    const form = new FormData();
    form.append("name", name);
    form.append(
      "file",
      new Blob([plsXml], { type: "application/pls+xml" }),
      "pronunciation.pls",
    );

    const res = await fetch(`${ELEVENLABS_API_URL}/v1/pronunciation-dictionaries`, {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { id?: string; version_id?: string };
    if (!data.id || !data.version_id) return null;

    return { dictionaryId: data.id, versionId: data.version_id };
  } catch {
    return null;
  }
}

export interface AlignmentWord {
  word: string;
  start: number;
  end: number;
}

export interface AlignmentData {
  words: AlignmentWord[];
}

export async function getAlignmentData(
  audioPath: string,
  script: string,
): Promise<AlignmentData | null> {
  const apiKey = getApiKey();

  try {
    const audioBuffer = fs.readFileSync(audioPath);
    const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });

    const form = new FormData();
    form.append("audio", audioBlob, "audio.mp3");
    form.append("transcript", script);

    const res = await fetch(`${ELEVENLABS_API_URL}/v1/forced-alignment`, {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      characters?: string[];
      character_start_times_seconds?: number[];
      character_end_times_seconds?: number[];
      words?: Array<{ word: string; start: number; end: number }>;
    };

    if (data.words && data.words.length > 0) {
      return { words: data.words };
    }

    if (
      data.characters &&
      data.character_start_times_seconds &&
      data.character_end_times_seconds
    ) {
      const words = charsToWords(
        data.characters,
        data.character_start_times_seconds,
        data.character_end_times_seconds,
      );
      return { words };
    }

    return null;
  } catch {
    return null;
  }
}

function charsToWords(
  chars: string[],
  starts: number[],
  ends: number[],
): AlignmentWord[] {
  const words: AlignmentWord[] = [];
  let currentWord = "";
  let wordStart = 0;

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === " " || c === "\n") {
      if (currentWord.length > 0) {
        words.push({
          word: currentWord,
          start: wordStart,
          end: ends[i - 1] ?? ends[i],
        });
        currentWord = "";
      }
    } else {
      if (currentWord.length === 0) wordStart = starts[i];
      currentWord += c;
    }
  }

  if (currentWord.length > 0) {
    words.push({
      word: currentWord,
      start: wordStart,
      end: ends[ends.length - 1],
    });
  }

  return words;
}

export async function generateNarratorIntro(
  title: string,
  dominantEmotion: string,
  riskLevel: string,
  analysisId: string,
): Promise<{ audioUrl: string; audioPath: string; script: string } | null> {
  const apiKey = getApiKey();

  const emotion = (dominantEmotion || "mixed").toLowerCase();
  const risk = (riskLevel || "medium").toLowerCase();
  const script = `Welcome to SwarmCast. Today we're analyzing: ${title}. Our swarm of twenty-five AI personas has reviewed this content. The dominant emotional response is ${emotion}, with a ${risk} risk level. Here are their voices.`;

  try {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/v1/text-to-speech/${NARRATOR_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: script,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.85,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!response.ok) return null;

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const dir = path.join(process.cwd(), "static", "audio", analysisId);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, "narrator_intro.mp3");
    fs.writeFileSync(filePath, audioBuffer);

    return {
      audioUrl: `/api/static/audio/${analysisId}/narrator_intro.mp3`,
      audioPath: filePath,
      script,
    };
  } catch {
    return null;
  }
}

export async function generateMontageTheme(
  avgSentiment: number,
  riskLevel: string,
  viralPotential: number,
  analysisId: string,
): Promise<{ audioUrl: string; audioPath: string } | null> {
  const apiKey = getApiKey();

  const risk = (riskLevel || "medium").toLowerCase();
  const viral = viralPotential ?? 0;
  const sentiment = avgSentiment ?? 0;

  let prompt: string;
  let durationSec = 6;

  if (sentiment > 0.4 && viral > 0.6) {
    prompt = "Upbeat energetic ambient electronic music with optimistic rising synths and subtle percussive beats, broadcast intro style";
  } else if (sentiment < -0.3 || risk === "high") {
    prompt = "Tense cinematic orchestral underscore with low drones and subtle tension, documentary news investigation style";
  } else if (viral > 0.5) {
    prompt = "Dynamic modern ambient music with pulsing electronic elements and forward momentum, viral content energy";
  } else if (sentiment > 0.1) {
    prompt = "Calm optimistic ambient instrumental with soft piano and gentle strings, thoughtful podcast intro style";
  } else {
    prompt = "Contemplative neutral ambient soundscape with soft texture, analytical documentary background mood";
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/v1/sound-generation`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: prompt,
        duration_seconds: durationSec,
        prompt_influence: 0.4,
      }),
    });

    if (!response.ok) return null;

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const dir = path.join(process.cwd(), "static", "audio", analysisId);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, "montage_theme.mp3");
    fs.writeFileSync(filePath, audioBuffer);

    return {
      audioUrl: `/api/static/audio/${analysisId}/montage_theme.mp3`,
      audioPath: filePath,
    };
  } catch {
    return null;
  }
}

export async function createSwarmAgent(
  analysisId: string,
  title: string,
  swarmSummary: string,
  personas: Array<{
    name: string;
    type: string;
    country: string;
    age: number;
    gender: string;
    background: string;
    mbti: string;
    accent: string;
    finalSentiment: number;
    influenceWeight: number;
    keyConcern: string;
    wouldShare: boolean;
    reaction: string;
    finalOpinion: string;
  }>,
  context: {
    keyThemes: string[];
    narrativeFractures: string[];
    contentSuggestions: string[];
    factCheckSummary: string;
    riskLevel: string;
    viralPotential: number;
    avgSentiment: number;
  },
): Promise<string | null> {
  const apiKey = getApiKey();

  const sorted = [...personas].sort((a, b) => a.finalSentiment - b.finalSentiment);

  const personaList = sorted
    .map((p, i) => {
      const rank = i + 1;
      const sentLabel = p.finalSentiment > 0.3 ? "supportive" : p.finalSentiment < -0.3 ? "opposing" : "neutral";
      return `${rank}. ${p.name} | ${p.age}yo ${p.gender}, ${p.country} (${p.accent} accent) | ${p.type} | MBTI: ${p.mbti} | sentiment: ${p.finalSentiment.toFixed(2)} (${sentLabel}) | influence: ${p.influenceWeight.toFixed(1)} | shares: ${p.wouldShare ? "yes" : "no"}
   Background: ${p.background.slice(0, 80)}
   Concern: ${p.keyConcern}
   Final opinion: "${p.finalOpinion.slice(0, 120)}"`;
    })
    .join("\n\n");

  const themesList = context.keyThemes.length > 0
    ? `Key themes: ${context.keyThemes.join(", ")}`
    : "";

  const fracturesList = context.narrativeFractures.length > 0
    ? `Narrative fractures:\n${context.narrativeFractures.map(f => `  • ${f}`).join("\n")}`
    : "";

  const suggestionsList = context.contentSuggestions.length > 0
    ? `Prescriptive improvements the swarm recommends:\n${context.contentSuggestions.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`
    : "";

  const sharingCount = personas.filter(p => p.wouldShare).length;
  const sharingPct = personas.length > 0 ? Math.round((sharingCount / personas.length) * 100) : 0;

  const systemPrompt = `You are the SwarmCast Collective — a meta-intelligence representing ${personas.length} diverse AI personas who have analysed content titled: "${title}".

## Swarm Summary
${swarmSummary}

## Sentiment Metrics
- Average sentiment: ${context.avgSentiment.toFixed(2)} (scale: -1 = strongly oppose, +1 = strongly support)
- Risk level: ${context.riskLevel}
- Viral potential: ${Math.round(context.viralPotential * 100)}%
- Would share: ${sharingPct}% (${sharingCount}/${personas.length} personas)

${themesList}

${fracturesList}

${context.factCheckSummary ? `## Fact-Check\n${context.factCheckSummary}` : ""}

${suggestionsList}

## All ${personas.length} Personas (sorted most-opposing → most-supportive)
${personaList}

---

## PERSONA ROLEPLAY PROTOCOL
When a user wants to speak WITH, hear FROM, or channel a specific persona — use ANY of these phrasings:
"talk to [name]", "let me hear from [name]", "put me through to [name]", "what does [name] say?", "speak as [name]", "I want [name]'s voice", "channel [name]", "what would [name] think?", or any description like "the most opposing one", "the oldest who agrees", "the skeptic", "the anxious one".

You MUST:
1. Start your ENTIRE response with the tag <<PERSONA:{exact_name}>> where {exact_name} is the persona's exact name from the list. This tag must be the very first characters of your response, nothing before it.
2. Immediately after the tag, speak in FIRST PERSON as that persona ("I believe...", "My concern is...")
3. Match their age, country, background, and keyConcern authentically
4. Speak in the emotional register their sentiment score implies (opposing = frustrated/skeptical, supportive = enthusiastic/optimistic)
5. Do NOT break character or explain that you are an AI. Speak purely as that person.
6. Stay in character and keep using <<PERSONA:{same_name}>> at the start of EVERY response until user asks to "go back", "return to the collective", "stop", or asks for a different persona.

Example of correct format: <<PERSONA:Sophie Miller>>I've seen this kind of announcement before and it always ends the same way...

## COLLECTIVE MODE
When NOT in persona mode, answer as the Collective. Do NOT use any <<PERSONA:...>> tag. Start responses directly with your analysis.

## PERSONA DISCOVERY — natural language mapping
Users can request personas by description, not just name. Match as follows:
- "most opposing" / "most against" / "most critical" / "skeptic" → persona #1 in the list (lowest sentiment)
- "most supportive" / "most positive" / "biggest fan" → last persona in list (highest sentiment)
- "most influential" → highest influenceWeight score
- "oldest" → highest age; "youngest" → lowest age
- "most likely to share" → would share: yes AND highest sentiment
- Combinations: "oldest that most agrees" → filter positive-sentiment personas, pick highest age
- "the anxious one" / "the worried one" → most negative sentiment
- Always confirm your match: "That maps to {name}, {age}yo from {country}..."

## COLLECTIVE MODE (default)
When not in persona roleplay mode, answer as the Collective: synthesise multiple views, cite specific personas by name, reference their sentiment and concerns. Present both supportive and critical voices. Keep responses under 180 words.`;

  const firstMessage = `Hello! I'm the SwarmCast Collective — ${personas.length} voices who just analysed "${title}". ${(swarmSummary ?? "").slice(0, 120)}... Ask me anything about the public reaction, or say "talk to [persona name]" to hear directly from one of them.`;

  try {
    const res = await fetch(`${ELEVENLABS_API_URL}/v1/convai/agents/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        name: `SwarmCast-${analysisId.slice(0, 8)}`,
        conversation_config: {
          agent: {
            prompt: {
              prompt: systemPrompt,
              llm: "gpt-4o-mini",
              temperature: 0.7,
              max_tokens: 200,
            },
            first_message: firstMessage,
            language: "en",
          },
          tts: {
            voice_id: NARRATOR_VOICE_ID,
          },
        },
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { agent_id?: string };
    return data.agent_id ?? null;
  } catch {
    return null;
  }
}

export async function getConvAISignedUrl(agentId: string): Promise<string | null> {
  const apiKey = getApiKey();
  try {
    const res = await fetch(
      `${ELEVENLABS_API_URL}/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": apiKey } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { signed_url?: string };
    return data.signed_url ?? null;
  } catch {
    return null;
  }
}
