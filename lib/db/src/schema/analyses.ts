import {
  pgTable,
  text,
  uuid,
  timestamp,
  doublePrecision,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const analysesTable = pgTable("analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  inputText: text("input_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  status: text("status").notNull().default("pending"),
  avgSentiment: doublePrecision("avg_sentiment"),
  dominantEmotion: text("dominant_emotion"),
  riskLevel: text("risk_level"),
  viralPotential: doublePrecision("viral_potential"),
  consensusForming: boolean("consensus_forming"),
  swarmSummary: text("swarm_summary"),
  marketQuestion: text("market_question"),
  marketProbability: doublePrecision("market_probability"),
  factCheck: jsonb("fact_check"),
  exaResults: jsonb("exa_results"),
  keyThemes: jsonb("key_themes"),
  narrativeFractures: jsonb("narrative_fractures"),
  montageUrl: text("montage_url"),
  errorMessage: text("error_message"),
  agentId: text("agent_id"),
  contentSuggestions: jsonb("content_suggestions"),
  problemSegments: jsonb("problem_segments"),
  montageTimeline: jsonb("montage_timeline"),
});

export const insertAnalysisSchema = createInsertSchema(analysesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;
