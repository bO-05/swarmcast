import {
  pgTable,
  uuid,
  integer,
  doublePrecision,
  boolean,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { analysesTable } from "./analyses";

export const forecastPointsTable = pgTable("forecast_points", {
  id: serial("id").primaryKey(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analysesTable.id, { onDelete: "cascade" }),
  hourOffset: integer("hour_offset"),
  sentiment: doublePrecision("sentiment"),
  confidenceLow: doublePrecision("confidence_low"),
  confidenceHigh: doublePrecision("confidence_high"),
  isForecast: boolean("is_forecast").default(false),
});

export const insertForecastPointSchema = createInsertSchema(
  forecastPointsTable,
).omit({ id: true });
export type InsertForecastPoint = z.infer<typeof insertForecastPointSchema>;
export type ForecastPoint = typeof forecastPointsTable.$inferSelect;
