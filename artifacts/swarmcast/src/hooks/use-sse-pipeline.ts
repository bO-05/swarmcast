import { useState, useEffect } from "react";

export type PipelineEvent = {
  type: string;
  data?: any;
};

export type PipelineState = {
  status: "idle" | "extracting" | "searching" | "fact_checking" | "generating_personas" | "designing_voices" | "generating_audio" | "building_montage" | "complete" | "error";
  voicesDesigned: number;
  voicesTotal: number;
  audioGenerated: number;
  audioTotal: number;
  error?: string;
};

export function useSsePipeline(analysisId: string | null) {
  const [state, setState] = useState<PipelineState>({
    status: "idle",
    voicesDesigned: 0,
    voicesTotal: 25,
    audioGenerated: 0,
    audioTotal: 25,
  });

  useEffect(() => {
    if (!analysisId) {
      setState({
        status: "idle",
        voicesDesigned: 0,
        voicesTotal: 25,
        audioGenerated: 0,
        audioTotal: 25,
      });
      return;
    }

    setState((prev) => ({ ...prev, status: "extracting" }));

    const es = new EventSource(`/api/analyses/${analysisId}/stream`);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        switch (event.type) {
          case "status":
            // extracting
            break;
          case "exa_done":
            setState((prev) => ({ ...prev, status: "searching" }));
            break;
          case "perplexity_done":
            setState((prev) => ({ ...prev, status: "fact_checking" }));
            break;
          case "personas_done":
            setState((prev) => ({ ...prev, status: "generating_personas" }));
            break;
          case "voice_progress":
            setState((prev) => ({
              ...prev,
              status: "designing_voices",
              voicesDesigned: event.data?.completed || 0,
              voicesTotal: event.data?.total || 25,
            }));
            break;
          case "audio_progress":
            setState((prev) => ({
              ...prev,
              status: "generating_audio",
              audioGenerated: event.data?.completed || 0,
              audioTotal: event.data?.total || 25,
            }));
            break;
          case "montage_done":
            setState((prev) => ({ ...prev, status: "building_montage" }));
            break;
          case "complete":
            setState((prev) => ({ ...prev, status: "complete" }));
            es.close();
            break;
          case "error":
            setState((prev) => ({ ...prev, status: "error", error: event.data?.message || "An error occurred" }));
            es.close();
            break;
        }
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    es.onerror = () => {
      console.error("SSE connection error");
      setState((prev) => ({ ...prev, status: "error", error: "Connection lost" }));
      es.close();
    };

    return () => {
      es.close();
    };
  }, [analysisId]);

  return state;
}
