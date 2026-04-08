import { ForecastPoint } from "@workspace/api-client-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart, ComposedChart } from 'recharts';

interface SentimentForecastChartProps {
  points: ForecastPoint[];
}

export function SentimentForecastChart({ points }: SentimentForecastChartProps) {
  // Sort points by hourOffset
  const sortedPoints = [...points].sort((a, b) => (a.hourOffset || 0) - (b.hourOffset || 0));

  const data = sortedPoints.map(p => ({
    hour: p.hourOffset,
    sentiment: p.sentiment,
    confidenceLow: p.confidenceLow,
    confidenceHigh: p.confidenceHigh,
    isForecast: p.isForecast,
    // Add separate fields for historical vs forecast to style differently
    historicalSentiment: p.isForecast ? null : p.sentiment,
    forecastSentiment: p.isForecast ? p.sentiment : null,
    // Need a connecting point between historical and forecast
    // We'll let Recharts handle gaps if needed, but it's continuous
  }));

  // Find the zero point (now) to add a reference line
  const nowPoint = data.find(d => d.hour === 0);

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
          <XAxis 
            dataKey="hour" 
            stroke="rgba(255,255,255,0.5)" 
            tickFormatter={(val) => val === 0 ? "Now" : val > 0 ? `+${val}h` : `${val}h`}
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
            tickMargin={10}
          />
          <YAxis 
            domain={[-1, 1]} 
            stroke="rgba(255,255,255,0.5)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
            tickFormatter={(val) => val.toFixed(1)}
            width={40}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(10, 15, 30, 0.9)', borderColor: 'rgba(59, 130, 246, 0.3)', borderRadius: '8px' }}
            itemStyle={{ color: '#fff' }}
            labelFormatter={(val) => val === 0 ? "Current Sentiment" : val > 0 ? `Forecast: +${val} Hours` : `Historical: ${val} Hours`}
          />
          
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
          <ReferenceLine x={0} stroke="rgba(59, 130, 246, 0.5)" strokeDasharray="3 3" label={{ position: 'top', value: 'Announcement', fill: 'rgba(59, 130, 246, 0.8)', fontSize: 12 }} />

          {/* Confidence Interval Area */}
          <Area 
            type="monotone" 
            dataKey="confidenceHigh" 
            stroke="none" 
            fill="rgba(59, 130, 246, 0.1)" 
            isAnimationActive={false}
          />
          <Area 
            type="monotone" 
            dataKey="confidenceLow" 
            stroke="none" 
            fill="var(--color-card)" // Trick to fill the bottom part back to background color
            isAnimationActive={false}
          />

          {/* Historical Line */}
          <Line 
            type="monotone" 
            dataKey="historicalSentiment" 
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: "#3b82f6", stroke: "#fff" }}
            connectNulls
          />
          
          {/* Forecast Line */}
          <Line 
            type="monotone" 
            dataKey="forecastSentiment" 
            stroke="#3b82f6" 
            strokeWidth={3}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 6, fill: "#3b82f6", stroke: "#fff" }}
            connectNulls
          />
          
          {/* A continuous hidden line just for full tooltips/connecting */}
          <Line 
            type="monotone" 
            dataKey="sentiment" 
            stroke="transparent" 
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
