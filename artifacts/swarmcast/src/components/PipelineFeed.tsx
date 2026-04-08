import type { ElementType } from "react";
import { PipelineState } from "@/hooks/use-sse-pipeline";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2, FileText, Search, ShieldCheck, Users, Mic, AudioLines, Radio } from "lucide-react";

interface PipelineFeedProps {
  state: PipelineState;
  analysisId: string;
}

const steps: Array<{ id: string; label: string; icon: ElementType; showProgress?: boolean }> = [
  { id: "extracting", label: "Extracting topics with Mistral", icon: FileText },
  { id: "searching", label: "Searching web & fact-checking with Perplexity", icon: Search },
  { id: "generating_personas", label: "Generating 25 personas with Mistral", icon: Users },
  { id: "designing_voices", label: "Designing unique voices with ElevenLabs", icon: Mic, showProgress: true },
  { id: "generating_audio", label: "Generating audio clips", icon: AudioLines, showProgress: true },
  { id: "building_montage", label: "Building Focus Group Podcast", icon: Radio },
  { id: "summarizing", label: "Generating swarm summary & forecast", icon: ShieldCheck },
];

export function PipelineFeed({ state, analysisId }: PipelineFeedProps) {
  const getStepStatus = (stepId: string) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    const currentIndex = steps.findIndex(s => s.id === state.status);
    
    if (state.status === "complete") return "done";
    if (state.status === "error") return currentIndex === stepIndex ? "error" : "pending";
    
    if (currentIndex > stepIndex) return "done";
    if (currentIndex === stepIndex) return "active";
    return "pending";
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card/30 backdrop-blur-md border border-primary/20 rounded-xl p-8 shadow-[0_0_50px_rgba(59,130,246,0.1)]">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight mb-2">Initializing SwarmCast</h2>
          <p className="text-muted-foreground text-sm font-mono tracking-wider uppercase">Session ID: {analysisId.split('-')[0]}</p>
        </div>

        <div className="space-y-6">
          {steps.map((step, idx) => {
            const status = getStepStatus(step.id);
            const Icon = step.icon;
            
            return (
              <motion.div 
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: status === "pending" ? 0.4 : 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`flex items-center gap-4 ${status === "active" ? "text-primary" : status === "done" ? "text-emerald-400" : "text-muted-foreground"}`}
              >
                <div className="relative flex-shrink-0">
                  {status === "done" ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : status === "active" ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                  {status === "active" && (
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                  )}
                </div>
                
                <div className="flex items-center justify-center w-8 h-8 rounded bg-background/50 border border-border/50">
                  <Icon className="w-4 h-4" />
                </div>
                
                <div className="flex-1">
                  <div className="font-medium text-lg">{step.label}</div>
                  
                  {step.showProgress && status === "active" && step.id === "designing_voices" && (
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300 ease-out" 
                          style={{ width: `${(state.voicesDesigned / state.voicesTotal) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs">{state.voicesDesigned} / {state.voicesTotal}</span>
                    </div>
                  )}
                  
                  {step.showProgress && status === "active" && step.id === "generating_audio" && (
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300 ease-out" 
                          style={{ width: `${(state.audioGenerated / state.audioTotal) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs">{state.audioGenerated} / {state.audioTotal}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {state.error && (
          <div className="mt-8 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-center">
            <h4 className="font-bold mb-1">Pipeline Error</h4>
            <p className="text-sm">{state.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
