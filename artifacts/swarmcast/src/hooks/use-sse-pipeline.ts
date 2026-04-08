import { useState, useEffect } from "react";

export type PipelineEvent = {
  type: string;
  message?: string;
  data?: unknown;
};

export type PipelineStatus =
  | "idle"
  | "extracting"
  | "searching"
  | "generating_personas"
  | "designing_voices"
  | "generating_audio"
  | "building_montage"
  | "summarizing"
  | "complete"
  | "error";

export type PipelineState = {
  status: PipelineStatus;
  currentMessage: string;
  voicesDesigned: number;
  voicesTotal: number;
  audioGenerated: number;
  audioTotal: number;
  error?: string;
};

function messageToStatus(msg: string): PipelineStatus {
  const m = msg.toLowerCase();
  if (m.includes("extracting")) return "extracting";
  if (m.includes("searching") || m.includes("exa") || m.includes("perplexity")) return "searching";
  if (m.includes("persona")) return "generating_personas";
  if (m.includes("voice") || m.includes("elevenlabs")) return "designing_voices";
  if (m.includes("audio") || m.includes("generating audio")) return "generating_audio";
  if (m.includes("montage") || m.includes("podcast")) return "building_montage";
  if (m.includes("summar")) return "summarizing";
  return "extracting";
}

export function useSsePipeline(analysisId: string | null) {
  const [state, setState] = useState<PipelineState>({
    status: "idle",
    currentMessage: "",
    voicesDesigned: 0,
    voicesTotal: 25,
    audioGenerated: 0,
    audioTotal: 8,
  });

  useEffect(() => {
    if (!analysisId) {
      setState({
        status: "idle",
        currentMessage: "",
        voicesDesigned: 0,
        voicesTotal: 25,
        audioGenerated: 0,
        audioTotal: 8,
      });
      return;
    }

    setState((prev) => ({ ...prev, status: "extracting", currentMessage: "Initializing..." }));

    const es = new EventSource(`/api/analyses/${analysisId}/stream`);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as PipelineEvent;
        switch (event.type) {
          case "status": {
            const msg = event.message ?? "";
            setState((prev) => ({
              ...prev,
              status: messageToStatus(msg),
              currentMessage: msg,
            }));
            break;
          }
          case "exa_done":
            setState((prev) => ({
              ...prev,
              currentMessage: "Web search complete",
            }));
            break;
          case "perplexity_done":
            setState((prev) => ({
              ...prev,
              currentMessage: "Fact-check complete",
            }));
            break;
          case "personas_done":
            setState((prev) => ({
              ...prev,
              currentMessage: "25 personas generated",
            }));
            break;
          case "voice_progress":
            setState((prev) => ({
              ...prev,
              status: "designing_voices",
              voicesDesigned: prev.voicesDesigned + 1,
              currentMessage: `Voice ${prev.voicesDesigned + 1}/${prev.voicesTotal} designed`,
            }));
            break;
          case "audio_progress":
            setState((prev) => ({
              ...prev,
              status: "generating_audio",
              audioGenerated: prev.audioGenerated + 1,
              currentMessage: `Audio ${prev.audioGenerated + 1}/${prev.audioTotal} generated`,
            }));
            break;
          case "montage_done":
            setState((prev) => ({
              ...prev,
              status: "building_montage",
              currentMessage: "Focus Group Podcast ready",
            }));
            break;
          case "complete":
            setState((prev) => ({ ...prev, status: "complete", currentMessage: "Analysis complete" }));
            es.close();
            break;
          case "error":
            setState((prev) => ({
              ...prev,
              status: "error",
              error: event.message ?? "An error occurred",
            }));
            es.close();
            break;
        }
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    es.onerror = () => {
      setState((prev) => ({ ...prev, status: "error", error: "Connection lost" }));
      es.close();
    };

    return () => {
      es.close();
    };
  }, [analysisId]);

  return state;
}
