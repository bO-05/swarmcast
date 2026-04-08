import { useParams, useLocation } from "wouter";
import { useGetAnalysis, getGetAnalysisQueryKey } from "@workspace/api-client-react";
import { AnalysisDashboard } from "@/components/AnalysisDashboard";
import { PipelineFeed } from "@/components/PipelineFeed";
import { useSsePipeline } from "@/hooks/use-sse-pipeline";
import { Share2, Check } from "lucide-react";
import { useState, useEffect } from "react";

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);

  const isNewSession = typeof sessionStorage !== "undefined" && sessionStorage.getItem(`new:${id}`) === "1";

  // Always fetch the analysis — we need its status to decide whether SSE is needed
  const { data: fullAnalysis, isLoading } = useGetAnalysis(id, {
    query: {
      enabled: !!id,
      queryKey: getGetAnalysisQueryKey(id),
      refetchInterval: (data) => {
        const s = (data as { status?: string } | undefined)?.status;
        return s === "complete" || s === "failed" ? false : 3000;
      },
      refetchIntervalInBackground: false,
    },
  });

  // Only open SSE when this is a new session AND the analysis is not yet complete
  const alreadyComplete = fullAnalysis?.status === "complete";
  const useSse = isNewSession && !alreadyComplete;

  const pipelineState = useSsePipeline(useSse ? id : null);

  const isPipelineActive =
    useSse &&
    pipelineState.status !== "idle" &&
    pipelineState.status !== "complete" &&
    pipelineState.status !== "error";

  // Clear the new-session marker once the pipeline finishes so future visits go straight to the dashboard
  useEffect(() => {
    if (pipelineState.status === "complete" && id) {
      sessionStorage.removeItem(`new:${id}`);
    }
  }, [pipelineState.status, id]);

  const handleSelectHistory = (newId: string) => {
    navigate(`/analysis/${newId}`);
  };

  const handleGoHome = () => {
    navigate("/");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isStillProcessing = fullAnalysis?.status === "processing" || fullAnalysis?.status === "created";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="px-6 h-14 flex items-center justify-between max-w-screen-2xl mx-auto">
          <button className="flex items-center gap-3 group" onClick={handleGoHome}>
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

          <div className="flex items-center gap-3">
            {!isPipelineActive && fullAnalysis?.status === "complete" && (
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5 text-positive" /> Copied</>
                ) : (
                  <><Share2 className="w-3.5 h-3.5" /> Share</>
                )}
              </button>
            )}
            {!isPipelineActive && (
              <button
                onClick={handleGoHome}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← New analysis
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {isPipelineActive ? (
          <PipelineFeed state={pipelineState} analysisId={id} />
        ) : isStillProcessing ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium">Swarm assembling…</p>
              <p className="text-xs text-muted-foreground mt-1">This page will update automatically when complete.</p>
            </div>
          </div>
        ) : fullAnalysis ? (
          <AnalysisDashboard
            analysis={fullAnalysis}
            onSelectHistory={handleSelectHistory}
            autoPlayMontage={isNewSession}
          />
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
            <p className="text-muted-foreground">Analysis not found.</p>
            <button className="text-sm text-primary hover:underline" onClick={handleGoHome}>
              Back to home
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
