import { Persona } from "@workspace/api-client-react";
import { AudioPlayer } from "./AudioPlayer";
import { motion } from "framer-motion";

interface PersonaCardProps {
  persona: Persona;
  index: number;
  isActive?: boolean;
  onPlay?: () => void;
  pipelineComplete?: boolean;
}

const typeColors: Record<string, string> = {
  skeptic:     "text-slate-400   border-slate-500/30   bg-slate-500/8",
  enthusiast:  "text-sky-400     border-sky-500/30     bg-sky-500/8",
  critic:      "text-rose-400    border-rose-500/30    bg-rose-500/8",
  concerned:   "text-amber-400   border-amber-500/30   bg-amber-500/8",
  influencer:  "text-violet-400  border-violet-500/30  bg-violet-500/8",
  institutional:"text-teal-400   border-teal-500/30    bg-teal-500/8",
};

function sentimentStyle(value: number) {
  if (value > 0.15) return { color: "var(--positive)", label: "Positive" };
  if (value < -0.15) return { color: "var(--negative)", label: "Negative" };
  return { color: "var(--neutral-sentiment)", label: "Neutral" };
}

export function PersonaCard({ persona, index, isActive, onPlay, pipelineComplete }: PersonaCardProps) {
  const typeKey = (persona.personaType || "").toLowerCase();
  const typeClass = typeColors[typeKey] ?? "text-slate-400 border-slate-500/30 bg-slate-500/8";

  const initial = sentimentStyle(persona.initialSentiment ?? 0);
  const final = sentimentStyle(persona.finalSentiment ?? 0);
  const shifted = (persona.finalSentiment ?? 0) - (persona.initialSentiment ?? 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.8), duration: 0.3 }}
      className={`flex flex-col p-4 rounded-lg border transition-colors ${
        isActive
          ? "border-primary/40 bg-card"
          : "border-border/40 bg-card/40 hover:border-border hover:bg-card/60"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold truncate">{persona.personaName || "Anonymous"}</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {[persona.age && `${persona.age}y`, persona.country, persona.mbti].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className={`flex-shrink-0 text-[10px] font-medium capitalize px-2 py-0.5 rounded border ${typeClass}`}>
          {persona.personaType || "Unknown"}
        </span>
      </div>

      {/* Quote */}
      <p className="text-[11px] text-muted-foreground italic line-clamp-2 mb-4 leading-relaxed flex-1">
        "{persona.background}"
      </p>

      {/* Sentiment delta */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono" style={{ color: initial.color }}>
            {(persona.initialSentiment ?? 0).toFixed(2)}
          </span>
          <span className="text-[10px] text-muted-foreground">→</span>
          <span className="text-[10px] font-mono font-semibold" style={{ color: final.color }}>
            {(persona.finalSentiment ?? 0).toFixed(2)}
          </span>
        </div>
        {Math.abs(shifted) > 0.05 && (
          <span className="text-[10px] font-mono" style={{ color: shifted > 0 ? "var(--positive)" : "var(--negative)" }}>
            {shifted > 0 ? "▲" : "▼"} {Math.abs(shifted).toFixed(2)}
          </span>
        )}
      </div>

      {/* Key concern */}
      {persona.keyConcern && (
        <p className="text-[11px] text-muted-foreground/70 mb-3 line-clamp-2 leading-relaxed">
          <span className="text-muted-foreground font-medium">Concern: </span>
          {persona.keyConcern}
        </p>
      )}

      {/* Audio */}
      {persona.audioUrl ? (
        <div onClick={onPlay}>
          <AudioPlayer src={persona.audioUrl} autoPlay={isActive} compact className="mt-auto" />
        </div>
      ) : (
        <div className={`mt-auto h-7 flex items-center justify-center rounded text-[10px] font-mono border ${
          pipelineComplete
            ? "border-border/20 text-muted-foreground/30"
            : "border-border/30 text-muted-foreground/50"
        }`}>
          {pipelineComplete ? "No audio" : "Generating…"}
        </div>
      )}
    </motion.div>
  );
}
