import { useState } from "react";
import { useGetAnalysis, getGetAnalysisQueryKey } from "@workspace/api-client-react";
import { InputForm } from "@/components/InputForm";
import { PipelineFeed } from "@/components/PipelineFeed";
import { AnalysisDashboard } from "@/components/AnalysisDashboard";
import { useSsePipeline } from "@/hooks/use-sse-pipeline";

export default function Home() {
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [isNewAnalysis, setIsNewAnalysis] = useState(false);

  const pipelineState = useSsePipeline(isNewAnalysis ? activeAnalysisId : null);
  const isPipelineActive =
    isNewAnalysis &&
    activeAnalysisId !== null &&
    pipelineState.status !== "idle" &&
    pipelineState.status !== "complete" &&
    pipelineState.status !== "error";

  const { data: fullAnalysis, isLoading: isLoadingAnalysis } = useGetAnalysis(
    activeAnalysisId || "",
    {
      query: {
        enabled: !!activeAnalysisId && !isPipelineActive,
        queryKey: getGetAnalysisQueryKey(activeAnalysisId || ""),
      },
    }
  );

  const handleCreateComplete = (id: string) => {
    setIsNewAnalysis(true);
    setActiveAnalysisId(id);
  };

  const handleSelectHistory = (id: string) => {
    setIsNewAnalysis(false);
    setActiveAnalysisId(id);
  };

  const handleGoHome = () => {
    setActiveAnalysisId(null);
    setIsNewAnalysis(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="px-6 h-14 flex items-center justify-between max-w-screen-2xl mx-auto">
          <button
            className="flex items-center gap-3 group"
            onClick={handleGoHome}
          >
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold tracking-tight">SC</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-sm tracking-tight">SwarmCast</span>
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest hidden sm:inline">
                Mission Control
              </span>
            </div>
          </button>

          {activeAnalysisId && !isPipelineActive && (
            <button
              onClick={handleGoHome}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← New analysis
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {!activeAnalysisId ? (
          <InputForm onCreateComplete={handleCreateComplete} onSelectHistory={handleSelectHistory} />
        ) : isPipelineActive ? (
          <PipelineFeed state={pipelineState} analysisId={activeAnalysisId} />
        ) : fullAnalysis ? (
          <AnalysisDashboard analysis={fullAnalysis} onSelectHistory={handleSelectHistory} autoPlayMontage={isNewAnalysis} />
        ) : isLoadingAnalysis ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
            <p className="text-muted-foreground">Analysis not found.</p>
            <button
              className="text-sm text-primary hover:underline"
              onClick={handleGoHome}
            >
              Back to home
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
