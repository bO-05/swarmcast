import type { ElementType } from "react";
import { PipelineState } from "@/hooks/use-sse-pipeline";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Loader2, FileText, Search, ShieldCheck, Users, Mic, AudioLines, Radio } from "lucide-react";

interface PipelineFeedProps {
  state: PipelineState;
  analysisId: string;
}

const steps: Array<{ id: string; label: string; icon: ElementType; detail?: string; showProgress?: boolean }> = [
  { id: "extracting",         label: "Extracting topics",         detail: "Mistral AI",      icon: FileText },
  { id: "searching",          label: "Web search & fact-check",   detail: "Exa + Perplexity", icon: Search },
  { id: "generating_personas",label: "Building 25 personas",      detail: "Mistral AI",      icon: Users },
  { id: "designing_voices",   label: "Designing voices",          detail: "ElevenLabs",      icon: Mic, showProgress: true },
  { id: "generating_audio",   label: "Recording clips",           detail: "ElevenLabs TTS",  icon: AudioLines, showProgress: true },
  { id: "building_montage",   label: "Assembling podcast",        detail: "ffmpeg",          icon: Radio },
  { id: "summarizing",        label: "Generating forecast",       detail: "Mistral AI",      icon: ShieldCheck },
];

export function PipelineFeed({ state, analysisId }: PipelineFeedProps) {
  const currentIndex = steps.findIndex(s => s.id === state.status);

  const getStepStatus = (stepId: string) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    if (state.status === "complete") return "done";
    if (state.status === "error") return currentIndex === stepIndex ? "error" : stepIndex < currentIndex ? "done" : "pending";
    if (currentIndex > stepIndex) return "done";
    if (currentIndex === stepIndex) return "active";
    return "pending";
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg space-y-1">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
            Session {analysisId.split("-")[0]}
          </p>
          <h2 className="font-display text-3xl text-foreground">
            {state.status === "error" ? "Pipeline failed" : "Swarm assembling…"}
          </h2>
          {state.currentMessage && (
            <p className="text-sm text-muted-foreground mt-2">{state.currentMessage}</p>
          )}
        </div>

        {/* Steps */}
        <div className="space-y-0">
          {steps.map((step, idx) => {
            const status = getStepStatus(step.id);
            const Icon = step.icon;
            const isActive = status === "active";
            const isDone = status === "done";
            const isPending = status === "pending";

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{
                  opacity: isPending ? 0.35 : 1,
                  x: 0,
                }}
                transition={{ delay: idx * 0.06, duration: 0.3 }}
                className="flex items-start gap-4 py-3 border-b border-border/30 last:border-0"
              >
                {/* Status icon */}
                <div className="flex-shrink-0 w-5 h-5 mt-0.5 relative">
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-positive" />
                  ) : isActive ? (
                    <>
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      <span className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                    </>
                  ) : status === "error" ? (
                    <Circle className="w-5 h-5 text-negative" />
                  ) : (
                    <Circle className="w-5 h-5 text-border" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-sm font-medium ${isDone ? "text-foreground/60" : isActive ? "text-foreground" : "text-foreground/40"}`}>
                      {step.label}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Icon className={`w-3.5 h-3.5 ${isActive ? "text-primary" : isDone ? "text-muted-foreground" : "text-border"}`} />
                      <span className="text-[10px] font-mono text-muted-foreground/60">
                        {step.detail}
                      </span>
                    </div>
                  </div>

                  {/* Voice progress */}
                  {step.showProgress && isActive && step.id === "designing_voices" && (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-0.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300 ease-out"
                          style={{ width: `${(state.voicesDesigned / state.voicesTotal) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground w-12 text-right">
                        {state.voicesDesigned}/{state.voicesTotal}
                      </span>
                    </div>
                  )}

                  {step.showProgress && isActive && step.id === "generating_audio" && (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-0.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300 ease-out"
                          style={{ width: `${(state.audioGenerated / state.audioTotal) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground w-12 text-right">
                        {state.audioGenerated}/{state.audioTotal}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {state.error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm"
            >
              {state.error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
