import { ForecastPoint } from "@workspace/api-client-react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

interface SentimentForecastChartProps {
  points: ForecastPoint[];
}

export function SentimentForecastChart({ points }: SentimentForecastChartProps) {
  const sortedPoints = [...points].sort((a, b) => (a.hourOffset || 0) - (b.hourOffset || 0));

  const data = sortedPoints.map(p => ({
    hour: p.hourOffset,
    sentiment: p.sentiment,
    confidenceLow: p.confidenceLow,
    confidenceHigh: p.confidenceHigh,
    isForecast: p.isForecast,
    historicalSentiment: p.isForecast ? null : p.sentiment,
    forecastSentiment: p.isForecast ? p.sentiment : null,
  }));

  const primary = "oklch(0.77 0.14 66)";
  const textMuted = "oklch(0.57 0.020 65)";
  const borderColor = "oklch(0.22 0.01 62)";

  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 16, bottom: 16, left: 8 }}>
          <CartesianGrid strokeDasharray="4 4" stroke={borderColor} vertical={false} />
          <XAxis
            dataKey="hour"
            stroke="none"
            tick={{ fill: textMuted, fontSize: 11, fontFamily: "DM Mono, monospace" }}
            tickMargin={8}
            tickFormatter={(val) => val === 0 ? "Now" : val > 0 ? `+${val}h` : `${val}h`}
          />
          <YAxis
            domain={[-1, 1]}
            stroke="none"
            tick={{ fill: textMuted, fontSize: 11, fontFamily: "DM Mono, monospace" }}
            tickFormatter={(val: number) => val.toFixed(1)}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "oklch(0.145 0.008 62)",
              border: `1px solid ${borderColor}`,
              borderRadius: "6px",
              fontSize: "12px",
              fontFamily: "DM Mono, monospace",
              color: "oklch(0.94 0.010 80)",
            }}
            labelFormatter={(val: number) =>
              val === 0 ? "Announcement" : val > 0 ? `+${val}h forecast` : `${val}h prior`
            }
            formatter={(val: number) => [val?.toFixed(3), "Sentiment"]}
          />

          <ReferenceLine y={0} stroke={borderColor} strokeDasharray="3 3" />
          <ReferenceLine
            x={0}
            stroke={primary}
            strokeDasharray="3 3"
            strokeOpacity={0.5}
            label={{ position: "top", value: "Now", fill: primary, fontSize: 10, fontFamily: "DM Mono, monospace" }}
          />

          {/* Confidence band */}
          <Area
            type="monotone"
            dataKey="confidenceHigh"
            stroke="none"
            fill={primary}
            fillOpacity={0.08}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="confidenceLow"
            stroke="none"
            fill="oklch(0.145 0.008 62)"
            isAnimationActive={false}
          />

          {/* Historical */}
          <Line
            type="monotone"
            dataKey="historicalSentiment"
            stroke={primary}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: primary, stroke: "oklch(0.10 0.008 62)", strokeWidth: 2 }}
            connectNulls
          />

          {/* Forecast */}
          <Line
            type="monotone"
            dataKey="forecastSentiment"
            stroke={primary}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            strokeOpacity={0.6}
            dot={false}
            activeDot={{ r: 4, fill: primary, stroke: "oklch(0.10 0.008 62)", strokeWidth: 2 }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
