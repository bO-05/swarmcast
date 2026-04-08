import { Router, type IRouter, type Request, type Response } from "express";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import { analysesTable, personasTable, forecastPointsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { runPipeline } from "../services/pipeline";
import * as sseBroker from "../services/sse-broker";
import { getConvAISignedUrl } from "../services/elevenlabs";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/analyses", async (req: Request, res: Response) => {
  const { title, text } = req.body as { title?: string; text?: string };

  if (!title || !text) {
    res.status(400).json({ error: "title and text are required" });
    return;
  }

  try {
    const [analysis] = await db
      .insert(analysesTable)
      .values({ title, inputText: text, status: "pending" })
      .returning();

    runPipeline(analysis.id, title, text).catch((err) => {
      logger.error({ err, analysisId: analysis.id }, "Pipeline error");
    });

    res.status(201).json({ id: analysis.id, status: "processing" });
  } catch (err) {
    logger.error({ err }, "Failed to create analysis");
    res.status(500).json({ error: "Failed to create analysis" });
  }
});

router.get("/analyses", async (_req: Request, res: Response) => {
  try {
    const analyses = await db
      .select({
        id: analysesTable.id,
        title: analysesTable.title,
        status: analysesTable.status,
        createdAt: analysesTable.createdAt,
        avgSentiment: analysesTable.avgSentiment,
        dominantEmotion: analysesTable.dominantEmotion,
        riskLevel: analysesTable.riskLevel,
      })
      .from(analysesTable)
      .orderBy(desc(analysesTable.createdAt))
      .limit(10);

    res.json(analyses);
  } catch (err) {
    logger.error({ err }, "Failed to list analyses");
    res.status(500).json({ error: "Failed to list analyses" });
  }
});

router.get("/analyses/:id", async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  try {
    const [analysis] = await db
      .select()
      .from(analysesTable)
      .where(eq(analysesTable.id, id));

    if (!analysis) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    const personas = await db
      .select()
      .from(personasTable)
      .where(eq(personasTable.analysisId, id));

    const forecastPoints = await db
      .select()
      .from(forecastPointsTable)
      .where(eq(forecastPointsTable.analysisId, id));

    res.json({ ...analysis, personas, forecastPoints });
  } catch (err) {
    logger.error({ err }, "Failed to get analysis");
    res.status(500).json({ error: "Failed to get analysis" });
  }
});

router.get("/analyses/:id/stream", (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  sseBroker.subscribe(id, res);

  const keepAlive = setInterval(() => {
    try {
      res.write(": keepalive\n\n");
    } catch {
      clearInterval(keepAlive);
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    sseBroker.unsubscribe(id, res);
  });
});

router.get("/analyses/:id/swarm-signed-url", async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  try {
    const [analysis] = await db
      .select({ agentId: analysesTable.agentId })
      .from(analysesTable)
      .where(eq(analysesTable.id, id));

    if (!analysis) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    if (!analysis.agentId) {
      res.status(404).json({ error: "Agent not ready for this analysis" });
      return;
    }

    const signedUrl = await getConvAISignedUrl(analysis.agentId);

    if (!signedUrl) {
      res.status(503).json({ error: "Failed to obtain ConvAI signed URL" });
      return;
    }

    res.json({ signedUrl });
  } catch (err) {
    logger.error({ err }, "Failed to get swarm signed URL");
    res.status(500).json({ error: "Internal server error" });
  }
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get("/static/audio/:analysisId/:file", (req: Request, res: Response) => {
  const { analysisId, file } = req.params as {
    analysisId: string;
    file: string;
  };

  if (!UUID_RE.test(analysisId)) {
    res.status(400).json({ error: "Invalid analysisId" });
    return;
  }

  const audioRoot = path.resolve(process.cwd(), "static", "audio", analysisId);
  const filePath = path.resolve(audioRoot, path.basename(file));

  if (!filePath.startsWith(audioRoot + path.sep)) {
    res.status(400).json({ error: "Invalid file path" });
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Audio file not found" });
    return;
  }

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Accept-Ranges", "bytes");
  fs.createReadStream(filePath).pipe(res);
});

export default router;
