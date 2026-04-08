import { cn } from "@/lib/utils";

interface GaugeProps {
  value: number; // -1 to 1
  size?: number;
  className?: string;
}

export function Gauge({ value, size = 120, className }: GaugeProps) {
  const normalizedValue = (value + 1) / 2; // 0 to 1
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - normalizedValue * circumference;

  let colorClass = "text-slate-500";
  if (value > 0.3) colorClass = "text-emerald-500";
  else if (value < -0.3) colorClass = "text-rose-500";

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-slate-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn("transition-all duration-1000 ease-out", colorClass)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{value.toFixed(2)}</span>
      </div>
    </div>
  );
}
