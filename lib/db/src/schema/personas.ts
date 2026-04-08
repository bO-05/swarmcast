import {
  pgTable,
  text,
  uuid,
  integer,
  doublePrecision,
  boolean,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { analysesTable } from "./analyses";

export const personasTable = pgTable("personas", {
  id: serial("id").primaryKey(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analysesTable.id, { onDelete: "cascade" }),
  personaName: text("persona_name"),
  personaType: text("persona_type"),
  background: text("background"),
  mbti: text("mbti"),
  age: integer("age"),
  country: text("country"),
  accent: text("accent"),
  gender: text("gender"),
  voiceStyle: text("voice_style"),
  activityLevel: doublePrecision("activity_level"),
  influenceWeight: doublePrecision("influence_weight"),
  sentimentBias: doublePrecision("sentiment_bias"),
  initialReaction: text("initial_reaction"),
  finalOpinion: text("final_opinion"),
  initialSentiment: doublePrecision("initial_sentiment"),
  finalSentiment: doublePrecision("final_sentiment"),
  beliefStance: doublePrecision("belief_stance"),
  beliefConfidence: doublePrecision("belief_confidence"),
  keyConcern: text("key_concern"),
  wouldShare: boolean("would_share"),
  platformPreference: text("platform_preference"),
  voiceId: text("voice_id"),
  audioUrl: text("audio_url"),
  hasAudio: boolean("has_audio").default(false),
  voiceScore: doublePrecision("voice_score"),
  rank: integer("rank"),
});

export const insertPersonaSchema = createInsertSchema(personasTable).omit({
  id: true,
});
export type InsertPersona = z.infer<typeof insertPersonaSchema>;
export type Persona = typeof personasTable.$inferSelect;
