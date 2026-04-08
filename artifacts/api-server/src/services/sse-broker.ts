import { Response } from "express";

type SseEvent = Record<string, unknown>;

const subscribers = new Map<string, Set<Response>>();
const eventHistory = new Map<string, SseEvent[]>();

export function subscribe(analysisId: string, res: Response): void {
  if (!subscribers.has(analysisId)) {
    subscribers.set(analysisId, new Set());
  }
  subscribers.get(analysisId)!.add(res);

  const history = eventHistory.get(analysisId) || [];
  for (const event of history) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }
}

export function unsubscribe(analysisId: string, res: Response): void {
  subscribers.get(analysisId)?.delete(res);
}

export function emit(analysisId: string, event: SseEvent): void {
  const history = eventHistory.get(analysisId) || [];
  history.push(event);
  eventHistory.set(analysisId, history);

  const subs = subscribers.get(analysisId);
  if (!subs) return;

  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of subs) {
    try {
      res.write(data);
    } catch {
      subs.delete(res);
    }
  }
}

export function cleanup(analysisId: string): void {
  const subs = subscribers.get(analysisId);
  if (subs) {
    for (const res of subs) {
      try {
        res.end();
      } catch {
        // ignore
      }
    }
    subscribers.delete(analysisId);
  }
  setTimeout(() => {
    eventHistory.delete(analysisId);
  }, 60000);
}
