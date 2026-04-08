import { Router } from "express";
import { fetchUrlContent } from "../services/exa";

const router = Router();

router.post("/fetch-url", async (req, res) => {
  const { url } = req.body as { url?: string };

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    res.status(400).json({ error: "Only http/https URLs are supported" });
    return;
  }

  try {
    const result = await fetchUrlContent(url);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch URL";
    res.status(502).json({ error: message });
  }
});

export default router;
