export interface ForecastPoint {
  hourOffset: number;
  sentiment: number;
  confidenceLow: number;
  confidenceHigh: number;
  isForecast: boolean;
}

export function buildForecast(
  initialSentiments: number[],
  avgSentiment: number,
  viralPotential: number,
): ForecastPoint[] {
  const points: ForecastPoint[] = [];

  const sorted = [...initialSentiments].sort((a, b) => a - b);
  const n = sorted.length;

  for (let i = 0; i < 20; i++) {
    const hourOffset = -(20 - i);
    const idx = Math.floor((i / 20) * n);
    const base = sorted[idx] ?? avgSentiment;
    const noise = (Math.random() - 0.5) * 0.15;
    const sentiment = Math.max(-1, Math.min(1, base + noise));
    const spread = 0.1 + viralPotential * 0.15;
    points.push({
      hourOffset,
      sentiment,
      confidenceLow: Math.max(-1, sentiment - spread),
      confidenceHigh: Math.min(1, sentiment + spread),
      isForecast: false,
    });
  }

  const momentum = avgSentiment * 0.3 + (viralPotential - 0.5) * 0.2;
  let current = avgSentiment;
  for (let i = 1; i <= 24; i++) {
    const decay = Math.exp(-i * 0.05);
    current = avgSentiment + momentum * decay + (Math.random() - 0.5) * 0.08;
    current = Math.max(-1, Math.min(1, current));
    const spread = 0.08 + (i / 24) * 0.2 + viralPotential * 0.1;
    points.push({
      hourOffset: i,
      sentiment: current,
      confidenceLow: Math.max(-1, current - spread),
      confidenceHigh: Math.min(1, current + spread),
      isForecast: true,
    });
  }

  return points;
}
