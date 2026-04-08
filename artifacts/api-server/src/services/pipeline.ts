import { db } from "@workspace/db";
import {
  analysesTable,
  personasTable,
  forecastPointsTable,
  type Persona,
  type Analysis,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { extractKeywords, generatePersonas, generateSwarmSummary } from "./mistral";
import { searchDiscourse } from "./exa";
import { factCheckDocument } from "./perplexity";
import {
  selectVoicesForPersonas,
  generatePersonaAudio,
  designVoiceForPersona,
  createPronunciationDictionary,
  generateNarratorIntro,
  getAlignmentData,
  createSwarmAgent,
  generateMontageTheme,
} from "./elevenlabs";
import { buildMontage, getAudioDurationSec } from "./montage";
import { buildForecast } from "./forecast";
import * as sseBroker from "./sse-broker";
import { logger } from "../lib/logger";

const SILENCE_SEC = 0.4;

function selectTop8<T extends {
  id: number;
  finalSentiment: number | null;
  influenceWeight: number | null;
  wouldShare: boolean | null;
}>(personas: T[]): T[] {
  return personas
    .map((p) => ({
      persona: p,
      voiceScore:
        Math.abs(p.finalSentiment ?? 0) *
        (p.influenceWeight ?? 1.0) *
        ((p.wouldShare ?? false) ? 1.3 : 1.0),
    }))
    .sort((a, b) => b.voiceScore - a.voiceScore)
    .slice(0, 8)
    .map((x) => x.persona);
}

export async function runPipeline(
  analysisId: string,
  title: string,
  text: string,
): Promise<void> {
  try {
    await db
      .update(analysesTable)
      .set({ status: "processing" })
      .where(eq(analysesTable.id, analysisId));

    sseBroker.emit(analysisId, {
      type: "status",
      message: "Extracting topics with Mistral...",
    });

    let keywords: { keywords: string; topic_summary: string };
    try {
      keywords = await extractKeywords(title, text);
    } catch (err) {
      logger.error({ err }, "Keyword extraction failed");
      keywords = { keywords: title, topic_summary: title };
    }

    sseBroker.emit(analysisId, {
      type: "status",
      message: "Searching web and fact-checking in parallel...",
    });

    const [exaResults, factCheck, pronunciationDict] = await Promise.allSettled([
      searchDiscourse(keywords.keywords),
      factCheckDocument(text),
      createPronunciationDictionary(`swarmcast-${analysisId.slice(0, 8)}`, keywords.keywords, title, text),
    ]);

    const exa =
      exaResults.status === "fulfilled"
        ? exaResults.value
        : (logger.error({ err: exaResults.reason }, "Exa search failed"), []);
    const factRaw =
      factCheck.status === "fulfilled"
        ? factCheck.value
        : (logger.error({ err: factCheck.reason }, "Perplexity fact-check failed"), null);
    const pronunciationDictLocator =
      pronunciationDict.status === "fulfilled" ? pronunciationDict.value : null;

    const fact = factRaw
      ? {
          objectiveAssessment: factRaw.objective_assessment,
          accuracyRating: factRaw.accuracy_rating,
          factCheckItems: factRaw.fact_check_items,
        }
      : null;

    await db
      .update(analysesTable)
      .set({
        exaResults: exa as unknown as Record<string, unknown>,
        factCheck: fact as unknown as Record<string, unknown>,
      })
      .where(eq(analysesTable.id, analysisId));

    sseBroker.emit(analysisId, { type: "exa_done", data: exa });
    sseBroker.emit(analysisId, { type: "perplexity_done", data: fact });

    sseBroker.emit(analysisId, {
      type: "status",
      message: "Generating 25 personas with Mistral...",
    });

    const factSummary = factRaw
      ? `Accuracy: ${factRaw.accuracy_rating}. ${factRaw.objective_assessment}`
      : "No fact-check available.";

    let personasRaw = await generatePersonas(title, text, exa, factSummary);
    if (personasRaw.length === 0) {
      throw new Error("Persona generation returned no personas");
    }

    const insertedPersonas = await db
      .insert(personasTable)
      .values(
        personasRaw.map((p) => ({
          analysisId,
          personaName: p.persona_name,
          personaType: p.persona_type,
          background: p.background,
          mbti: p.mbti,
          age: p.age,
          country: p.country,
          accent: p.accent,
          gender: p.gender,
          voiceStyle: p.voice_style,
          activityLevel: p.activity_level,
          influenceWeight: p.influence_weight,
          sentimentBias: p.sentiment_bias,
          initialReaction: p.initial_reaction,
          finalOpinion: p.final_opinion,
          initialSentiment: p.initial_sentiment,
          finalSentiment: p.final_sentiment,
          beliefStance: p.belief_state?.stance,
          beliefConfidence: p.belief_state?.confidence,
          keyConcern: p.key_concern,
          wouldShare: p.would_share,
          platformPreference: p.platform_preference,
        })),
      )
      .returning();

    sseBroker.emit(analysisId, { type: "personas_done", data: insertedPersonas });

    sseBroker.emit(analysisId, {
      type: "status",
      message: "Generating swarm summary and prescriptive insights...",
    });

    const swarmRaw = await generateSwarmSummary(
      insertedPersonas.map((p: Persona) => ({
        persona_name: p.personaName ?? "",
        persona_type: p.personaType ?? "",
        background: p.background ?? "",
        mbti: p.mbti ?? "",
        age: p.age ?? 30,
        country: p.country ?? "",
        accent: p.accent ?? "",
        gender: p.gender ?? "",
        voice_style: p.voiceStyle ?? "",
        activity_level: p.activityLevel ?? 0.5,
        influence_weight: p.influenceWeight ?? 1.0,
        sentiment_bias: p.sentimentBias ?? 0,
        initial_reaction: p.initialReaction ?? "",
        final_opinion: p.finalOpinion ?? "",
        initial_sentiment: p.initialSentiment ?? 0,
        final_sentiment: p.finalSentiment ?? 0,
        belief_state: {
          stance: p.beliefStance ?? 0,
          confidence: p.beliefConfidence ?? 0.5,
        },
        key_concern: p.keyConcern ?? "",
        would_share: p.wouldShare ?? false,
        platform_preference: p.platformPreference ?? "twitter",
      })),
      text,
    );

    const contentSuggestions = swarmRaw.content_suggestions ?? [];
    const problemSegments = (swarmRaw.problem_segments ?? []).map((s) => ({
      quote: s.quote,
      triggeredBy: s.triggered_by,
      reason: s.reason,
    }));

    const initialSentiments = insertedPersonas
      .map((p: Persona) => p.initialSentiment ?? 0)
      .filter((s: number) => s !== null);

    const forecastPoints = buildForecast(
      initialSentiments,
      swarmRaw.avg_sentiment,
      swarmRaw.viral_potential,
    );

    await db.insert(forecastPointsTable).values(
      forecastPoints.map((fp) => ({
        analysisId,
        hourOffset: fp.hourOffset,
        sentiment: fp.sentiment,
        confidenceLow: fp.confidenceLow,
        confidenceHigh: fp.confidenceHigh,
        isForecast: fp.isForecast,
      })),
    );

    await db
      .update(analysesTable)
      .set({
        avgSentiment: swarmRaw.avg_sentiment,
        dominantEmotion: swarmRaw.dominant_emotion,
        riskLevel: swarmRaw.risk_level,
        viralPotential: swarmRaw.viral_potential,
        consensusForming: swarmRaw.consensus_forming,
        swarmSummary: swarmRaw.swarm_summary_paragraph,
        marketQuestion: swarmRaw.market_question,
        marketProbability: swarmRaw.market_probability,
        keyThemes: swarmRaw.key_themes as unknown as Record<string, unknown>,
        narrativeFractures: swarmRaw.narrative_fractures as unknown as Record<string, unknown>,
        contentSuggestions: contentSuggestions as unknown as Record<string, unknown>,
        problemSegments: problemSegments as unknown as Record<string, unknown>,
      })
      .where(eq(analysesTable.id, analysisId));

    sseBroker.emit(analysisId, {
      type: "status",
      message: "Assigning voices to all personas...",
    });

    const top8 = selectTop8(insertedPersonas) as Persona[];
    const top8Ids = new Set(top8.map((p) => p.id));
    const nonTop8 = insertedPersonas.filter((p: Persona) => !top8Ids.has(p.id));

    const libraryVoiceAssignments = selectVoicesForPersonas(
      nonTop8.map((p: Persona) => ({ id: p.id, gender: p.gender, accent: p.accent, age: p.age })),
    );

    await Promise.all(
      nonTop8.map(async (p: Persona) => {
        const voiceId = libraryVoiceAssignments.get(p.id);
        if (voiceId) {
          await db
            .update(personasTable)
            .set({ voiceId })
            .where(eq(personasTable.id, p.id));
        }
      }),
    );

    sseBroker.emit(analysisId, {
      type: "status",
      message: "Designing unique voices for top 8 personas (Voice Design API)...",
    });

    await Promise.all(
      top8.map(async (p) => {
        let voiceId: string | null = null;
        try {
          voiceId = await designVoiceForPersona({
            personaName: p.personaName ?? "Unknown",
            gender: p.gender ?? "male",
            age: p.age ?? 30,
            country: p.country ?? "United States",
            accent: p.accent ?? "American",
            voiceStyle: p.voiceStyle ?? "calm and measured",
            personaType: p.personaType ?? "neutral",
            background: p.background ?? "",
          });
        } catch (err) {
          logger.error({ err, personaId: p.id }, "Voice Design API failed");
        }

        if (!voiceId) {
          const fallback = selectVoicesForPersonas([
            { id: p.id, gender: p.gender, accent: p.accent, age: p.age },
          ]);
          voiceId = fallback.get(p.id) ?? null;
        }

        if (voiceId) {
          await db
            .update(personasTable)
            .set({ voiceId })
            .where(eq(personasTable.id, p.id));
          sseBroker.emit(analysisId, {
            type: "voice_progress",
            data: { personaId: p.id, voiceId },
          });
        }
      }),
    );

    const updatedPersonas = await db
      .select()
      .from(personasTable)
      .where(eq(personasTable.analysisId, analysisId));

    sseBroker.emit(analysisId, {
      type: "status",
      message: "Generating narrator intro and mood-adaptive theme...",
    });

    const [narratorIntroResult, montageThemeResult] = await Promise.allSettled([
      generateNarratorIntro(
        title,
        swarmRaw.dominant_emotion ?? "mixed",
        swarmRaw.risk_level ?? "medium",
        analysisId,
      ),
      generateMontageTheme(
        swarmRaw.avg_sentiment ?? 0,
        swarmRaw.risk_level ?? "medium",
        swarmRaw.viral_potential ?? 0,
        analysisId,
      ),
    ]);

    const narratorIntro =
      narratorIntroResult.status === "fulfilled"
        ? narratorIntroResult.value
        : (logger.error({ err: narratorIntroResult.reason }, "Narrator intro failed"), null);

    const montageTheme =
      montageThemeResult.status === "fulfilled"
        ? montageThemeResult.value
        : (logger.error({ err: montageThemeResult.reason }, "Montage theme failed"), null);

    sseBroker.emit(analysisId, {
      type: "status",
      message: "Generating audio clips with emotional voice tuning...",
    });

    const personasWithVoice = updatedPersonas.filter((p: Persona) => p.voiceId && top8Ids.has(p.id));
    const firstExaTitle = exa.length > 0 ? exa[0].title : "recent coverage";

    interface ClipResult {
      personaId: number;
      personaName: string;
      audioUrl: string;
      audioPath: string;
      script: string;
      alignmentData: { words: Array<{ word: string; start: number; end: number }> } | null;
    }

    const clipResults = await Promise.allSettled(
      personasWithVoice.map(async (p: Persona): Promise<ClipResult> => {
        const audioResult = await generatePersonaAudio(
          {
            id: p.id,
            voiceId: p.voiceId!,
            personaName: p.personaName ?? "Unknown",
            age: p.age ?? 30,
            country: p.country ?? "Unknown",
            initialReaction: p.initialReaction ?? "",
            finalOpinion: p.finalOpinion ?? "",
            keyConcern: p.keyConcern ?? "",
            finalSentiment: p.finalSentiment ?? 0,
            influenceWeight: p.influenceWeight ?? 1.5,
            beliefConfidence: p.beliefConfidence ?? 0.5,
            mbti: p.mbti ?? "INTJ",
          },
          analysisId,
          firstExaTitle,
          pronunciationDictLocator ?? undefined,
        );

        const alignment = await getAlignmentData(audioResult.audioPath, audioResult.script).catch(
          () => null,
        );

        await db
          .update(personasTable)
          .set({
            audioUrl: audioResult.audioUrl,
            hasAudio: true,
            alignmentData: alignment as unknown as Record<string, unknown>,
          })
          .where(eq(personasTable.id, p.id));

        sseBroker.emit(analysisId, {
          type: "audio_progress",
          data: { personaId: p.id, audioUrl: audioResult.audioUrl },
        });

        return {
          personaId: p.id,
          personaName: p.personaName ?? "Unknown",
          audioUrl: audioResult.audioUrl,
          audioPath: audioResult.audioPath,
          script: audioResult.script,
          alignmentData: alignment,
        };
      }),
    );

    const successfulClips: ClipResult[] = [];
    for (let i = 0; i < clipResults.length; i++) {
      const result = clipResults[i];
      if (result.status === "fulfilled") {
        successfulClips.push(result.value);
      } else {
        logger.error({ err: result.reason, personaId: personasWithVoice[i].id }, "TTS failed");
      }
    }

    sseBroker.emit(analysisId, {
      type: "status",
      message: "Building Focus Group Podcast montage...",
    });

    const audioUrls: string[] = [];
    if (montageTheme) audioUrls.push(montageTheme.audioUrl);
    if (narratorIntro) audioUrls.push(narratorIntro.audioUrl);
    for (const clip of successfulClips) audioUrls.push(clip.audioUrl);

    const personaSentimentMap = new Map<number, number>(
      insertedPersonas.map((p: Persona) => [p.id, (p.finalSentiment ?? 0) as number]),
    );

    let montageUrl: string | null = null;
    let montageTimeline: Array<{
      personaId: number | null;
      personaName: string;
      startSec: number;
      endSec: number;
      script: string;
      sentiment: number | null;
      words: Array<{ word: string; start: number; end: number }> | null;
    }> = [];

    if (audioUrls.length > 0) {
      try {
        montageUrl = await buildMontage(audioUrls, analysisId);

        let currentSec = 0;

        if (montageTheme) {
          const dur = getAudioDurationSec(montageTheme.audioPath);
          montageTimeline.push({
            personaId: null,
            personaName: "Swarm Theme",
            startSec: currentSec,
            endSec: currentSec + dur,
            script: "",
            sentiment: swarmRaw.avg_sentiment ?? null,
            words: null,
          });
          currentSec += dur + SILENCE_SEC;
        }

        if (narratorIntro) {
          const dur = getAudioDurationSec(narratorIntro.audioPath);
          montageTimeline.push({
            personaId: null,
            personaName: "SwarmCast Narrator",
            startSec: currentSec,
            endSec: currentSec + dur,
            script: narratorIntro.script,
            sentiment: null,
            words: null,
          });
          currentSec += dur + SILENCE_SEC;
        }

        for (const clip of successfulClips) {
          const dur = getAudioDurationSec(clip.audioPath);
          montageTimeline.push({
            personaId: clip.personaId,
            personaName: clip.personaName,
            startSec: currentSec,
            endSec: currentSec + dur,
            script: clip.script,
            sentiment: personaSentimentMap.get(clip.personaId) ?? null,
            words: clip.alignmentData?.words ?? null,
          });
          currentSec += dur + SILENCE_SEC;
        }

        await db
          .update(analysesTable)
          .set({
            montageUrl,
            montageTimeline: montageTimeline as unknown as Record<string, unknown>,
          })
          .where(eq(analysesTable.id, analysisId));

        sseBroker.emit(analysisId, { type: "montage_done", data: { montageUrl } });
      } catch (err) {
        logger.error({ err }, "Montage build failed");
      }
    }

    sseBroker.emit(analysisId, {
      type: "status",
      message: "Creating SwarmCast ConvAI agent...",
    });

    const agentId = await createSwarmAgent(
      analysisId,
      title,
      swarmRaw.swarm_summary_paragraph,
      insertedPersonas.map((p: Persona) => ({
        name: p.personaName ?? "Unknown",
        type: p.personaType ?? "neutral",
        country: p.country ?? "Unknown",
        age: p.age ?? 30,
        gender: p.gender ?? "unknown",
        background: p.background ?? "",
        mbti: p.mbti ?? "INFP",
        accent: p.accent ?? "American",
        finalSentiment: p.finalSentiment ?? 0,
        influenceWeight: p.influenceWeight ?? 1,
        keyConcern: p.keyConcern ?? "",
        wouldShare: p.wouldShare ?? false,
        reaction: p.initialReaction ?? "",
        finalOpinion: p.finalOpinion ?? "",
      })),
      {
        keyThemes: (swarmRaw.key_themes ?? []) as string[],
        narrativeFractures: (swarmRaw.narrative_fractures ?? []) as string[],
        contentSuggestions: (swarmRaw.content_suggestions ?? []) as string[],
        factCheckSummary: fact?.objectiveAssessment ?? "",
        riskLevel: swarmRaw.risk_level ?? "medium",
        viralPotential: swarmRaw.viral_potential ?? 0,
        avgSentiment: swarmRaw.avg_sentiment ?? 0,
      },
    ).catch((err) => {
      logger.error({ err }, "Agent creation failed");
      return null;
    });

    if (agentId) {
      await db
        .update(analysesTable)
        .set({ agentId, status: "complete" })
        .where(eq(analysesTable.id, analysisId));
      sseBroker.emit(analysisId, { type: "agent_ready", data: { agentId } });
    } else {
      await db
        .update(analysesTable)
        .set({ status: "complete" })
        .where(eq(analysesTable.id, analysisId));
    }

    const fullAnalysis = await db
      .select()
      .from(analysesTable)
      .where(eq(analysesTable.id, analysisId))
      .then((rows: Analysis[]) => rows[0]);

    const allPersonas = await db
      .select()
      .from(personasTable)
      .where(eq(personasTable.analysisId, analysisId));

    const allForecast = await db
      .select()
      .from(forecastPointsTable)
      .where(eq(forecastPointsTable.analysisId, analysisId));

    sseBroker.emit(analysisId, {
      type: "complete",
      data: {
        ...fullAnalysis,
        personas: allPersonas,
        forecastPoints: allForecast,
      },
    });

    sseBroker.cleanup(analysisId);
  } catch (err) {
    logger.error({ err, analysisId }, "Pipeline failed");

    await db
      .update(analysesTable)
      .set({
        status: "failed",
        errorMessage:
          err instanceof Error ? err.message : "Unknown pipeline error",
      })
      .where(eq(analysesTable.id, analysisId));

    sseBroker.emit(analysisId, {
      type: "error",
      message: err instanceof Error ? err.message : "Pipeline failed",
    });

    sseBroker.cleanup(analysisId);
  }
}
