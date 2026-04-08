import { useState } from "react";
import { useListAnalyses, useGetAnalysis, getGetAnalysisQueryKey } from "@workspace/api-client-react";
import { InputForm } from "@/components/InputForm";
import { PipelineFeed } from "@/components/PipelineFeed";
import { AnalysisDashboard } from "@/components/AnalysisDashboard";
import { useSsePipeline } from "@/hooks/use-sse-pipeline";

export default function Home() {
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  
  const pipelineState = useSsePipeline(activeAnalysisId);
  const isProcessing = activeAnalysisId && pipelineState.status !== "idle" && pipelineState.status !== "complete" && pipelineState.status !== "error";
  
  const { data: fullAnalysis, isLoading: isLoadingAnalysis } = useGetAnalysis(
    activeAnalysisId || "",
    {
      query: {
        enabled: !!activeAnalysisId && (pipelineState.status === "complete" || pipelineState.status === "error" || pipelineState.status === "idle"),
        queryKey: getGetAnalysisQueryKey(activeAnalysisId || ""),
      },
    }
  );

  const handleCreateComplete = (id: string) => {
    setActiveAnalysisId(id);
  };

  const handleSelectHistory = (id: string) => {
    setActiveAnalysisId(id);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveAnalysisId(null)}>
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-primary-foreground shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              SC
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none tracking-tight">SwarmCast</h1>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Mission Control</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {!activeAnalysisId ? (
          <InputForm onCreateComplete={handleCreateComplete} onSelectHistory={handleSelectHistory} />
        ) : isProcessing ? (
          <PipelineFeed state={pipelineState} analysisId={activeAnalysisId} />
        ) : fullAnalysis ? (
          <AnalysisDashboard analysis={fullAnalysis} onSelectHistory={handleSelectHistory} />
        ) : isLoadingAnalysis ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <h2 className="text-2xl font-bold mb-2">Analysis Failed or Not Found</h2>
            <p className="text-muted-foreground mb-6">Could not load the analysis data.</p>
            <button 
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium"
              onClick={() => setActiveAnalysisId(null)}
            >
              Back to Home
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
