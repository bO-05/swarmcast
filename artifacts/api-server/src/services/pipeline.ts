import { db } from "@workspace/db";
import {
  analysesTable,
  personasTable,
  forecastPointsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { extractKeywords, generatePersonas, generateSwarmSummary } from "./mistral";
import { searchDiscourse } from "./exa";
import { factCheckDocument } from "./perplexity";
import { createPersonaVoice, generatePersonaAudio } from "./elevenlabs";
import { buildMontage } from "./montage";
import { buildForecast } from "./forecast";
import * as sseBroker from "./sse-broker";
import { logger } from "../lib/logger";

function selectTop8(
  personas: Array<{
    id: number;
    finalSentiment: number | null;
    influenceWeight: number | null;
    wouldShare: boolean | null;
  }>,
): typeof personas {
  return personas
    .map((p) => ({
      ...p,
      voiceScore:
        Math.abs(p.finalSentiment ?? 0) *
        (p.influenceWeight ?? 1.0) *
        ((p.wouldShare ?? false) ? 1.3 : 1.0),
    }))
    .sort((a, b) => b.voiceScore - a.voiceScore)
    .slice(0, 8);
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
      message: "Searching web with Exa and fact-checking with Perplexity...",
    });

    const [exaResults, factCheck] = await Promise.allSettled([
      searchDiscourse(keywords.keywords),
      factCheckDocument(text),
    ]);

    const exa =
      exaResults.status === "fulfilled"
        ? exaResults.value
        : (logger.error({ err: exaResults.reason }, "Exa search failed"), []);
    const fact =
      factCheck.status === "fulfilled"
        ? factCheck.value
        : (logger.error(
            { err: factCheck.reason },
            "Perplexity fact-check failed",
          ),
          null);

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

    const factSummary = fact
      ? `Accuracy: ${fact.accuracy_rating}. ${fact.objective_assessment}`
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

    sseBroker.emit(analysisId, {
      type: "personas_done",
      data: insertedPersonas,
    });

    sseBroker.emit(analysisId, {
      type: "status",
      message: "Designing 25 unique voices with ElevenLabs Voice Design...",
    });

    const batchSize = 5;
    for (let i = 0; i < insertedPersonas.length; i += batchSize) {
      const batch = insertedPersonas.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((p) =>
          createPersonaVoice({
            gender: p.gender ?? "male",
            age: p.age ?? 30,
            accent: p.accent ?? "American",
            initialReaction: p.initialReaction ?? "",
          }),
        ),
      );

      for (let j = 0; j < batch.length; j++) {
        const p = batch[j];
        const result = results[j];
        if (result.status === "fulfilled") {
          await db
            .update(personasTable)
            .set({ voiceId: result.value })
            .where(eq(personasTable.id, p.id));
          sseBroker.emit(analysisId, {
            type: "voice_progress",
            data: { personaId: p.id, voiceId: result.value },
          });
        } else {
          logger.error(
            { err: result.reason, personaId: p.id },
            "Voice Design failed for persona",
          );
        }
      }
    }

    const updatedPersonas = await db
      .select()
      .from(personasTable)
      .where(eq(personasTable.analysisId, analysisId));

    sseBroker.emit(analysisId, {
      type: "status",
      message: "Generating audio clips for top personas...",
    });

    const personasWithVoice = updatedPersonas.filter((p) => p.voiceId);
    const top8 = selectTop8(personasWithVoice);
    const firstExaTitle = exa.length > 0 ? exa[0].title : "recent coverage";

    const audioResults = await Promise.allSettled(
      top8.map((p) =>
        generatePersonaAudio(
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
          },
          analysisId,
          firstExaTitle,
        ),
      ),
    );

    const audioUrls: string[] = [];
    for (let j = 0; j < top8.length; j++) {
      const p = top8[j];
      const result = audioResults[j];
      if (result.status === "fulfilled") {
        await db
          .update(personasTable)
          .set({ audioUrl: result.value, hasAudio: true })
          .where(eq(personasTable.id, p.id));
        audioUrls.push(result.value);
        sseBroker.emit(analysisId, {
          type: "audio_progress",
          data: { personaId: p.id, audioUrl: result.value },
        });
      } else {
        logger.error({ err: result.reason, personaId: p.id }, "TTS failed");
      }
    }

    sseBroker.emit(analysisId, {
      type: "status",
      message: "Building Focus Group Podcast montage...",
    });

    let montageUrl: string | null = null;
    if (audioUrls.length > 0) {
      try {
        montageUrl = await buildMontage(audioUrls, analysisId);
        await db
          .update(analysesTable)
          .set({ montageUrl })
          .where(eq(analysesTable.id, analysisId));
        sseBroker.emit(analysisId, {
          type: "montage_done",
          data: { montageUrl },
        });
      } catch (err) {
        logger.error({ err }, "Montage build failed");
      }
    }

    sseBroker.emit(analysisId, {
      type: "status",
      message: "Generating swarm summary...",
    });

    const finalPersonas = await db
      .select()
      .from(personasTable)
      .where(eq(personasTable.analysisId, analysisId));

    const swarmRaw = await generateSwarmSummary(
      finalPersonas.map((p) => ({
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
    );

    const initialSentiments = finalPersonas
      .map((p) => p.initialSentiment ?? 0)
      .filter((s) => s !== null);

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
        status: "complete",
        avgSentiment: swarmRaw.avg_sentiment,
        dominantEmotion: swarmRaw.dominant_emotion,
        riskLevel: swarmRaw.risk_level,
        viralPotential: swarmRaw.viral_potential,
        consensusForming: swarmRaw.consensus_forming,
        swarmSummary: swarmRaw.swarm_summary_paragraph,
        marketQuestion: swarmRaw.market_question,
        marketProbability: swarmRaw.market_probability,
        keyThemes: swarmRaw.key_themes as unknown as Record<string, unknown>,
        narrativeFractures: swarmRaw.narrative_fractures as unknown as Record<
          string,
          unknown
        >,
      })
      .where(eq(analysesTable.id, analysisId));

    const fullAnalysis = await db
      .select()
      .from(analysesTable)
      .where(eq(analysesTable.id, analysisId))
      .then((rows) => rows[0]);

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
