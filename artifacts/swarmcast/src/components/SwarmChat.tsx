import { useState, useRef, useEffect, useCallback } from "react";
import { Conversation } from "@11labs/client";
import { Mic, MicOff, X, Radio, Loader2, MessageSquare, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGetSwarmSignedUrl } from "@workspace/api-client-react";

interface ChatMessage {
  source: "user" | "ai";
  message: string;
  id: number;
}

interface SwarmChatProps {
  analysisId: string;
  agentId: string;
  title: string;
}

type ConvStatus = "idle" | "connecting" | "connected" | "disconnecting";

export function SwarmChat({ analysisId, agentId, title }: SwarmChatProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ConvStatus>("idle");
  const [mode, setMode] = useState<"speaking" | "listening">("listening");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [micOpen, setMicOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationRef = useRef<Conversation | null>(null);
  const msgIdRef = useRef(0);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const micOpenRef = useRef(false);

  const { data: signedUrlData, isLoading: loadingUrl, isError: urlError } =
    useGetSwarmSignedUrl(analysisId);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const signedUrlRef = useRef<string | undefined>(undefined);
  signedUrlRef.current = signedUrlData?.signedUrl;

  useEffect(() => {
    if (!open || status !== "idle") return;
    if (urlError) {
      setError("Could not reach the swarm agent. The agent may not be ready yet.");
      return;
    }
    const url = signedUrlRef.current;
    if (!url) return;
    startSession(url);
  }, [open, signedUrlData?.signedUrl, status, urlError]);

  useEffect(() => {
    return () => {
      const conv = conversationRef.current;
      if (conv) {
        conv.setVolume({ volume: 0 });
        conv.endSession().catch(() => null);
        conversationRef.current = null;
      }
    };
  }, []);

  async function startSession(signedUrl: string) {
    setStatus("connecting");
    setError(null);
    setMessages([]);
    setMicOpen(false);
    micOpenRef.current = false;

    try {
      const conversation = await Conversation.startSession({
        signedUrl,
        onConnect: () => setStatus("connected"),
        onDisconnect: () => {
          setStatus("idle");
          setMicOpen(false);
          micOpenRef.current = false;
          conversationRef.current = null;
        },
        onMessage: ({ message, source }) => {
          setMessages((prev) => [
            ...prev,
            { source, message, id: ++msgIdRef.current },
          ]);
        },
        onError: (msg) => {
          setError(msg);
          setStatus("idle");
          setMicOpen(false);
          micOpenRef.current = false;
        },
        onModeChange: ({ mode: m }) => {
          setMode(m);
          if (m === "speaking") {
            if (micOpenRef.current && conversationRef.current) {
              conversationRef.current.setMicMuted(true);
              micOpenRef.current = false;
              setMicOpen(false);
            }
            conversationRef.current?.setVolume({ volume: 1 });
          }
        },
        onStatusChange: ({ status: s }) => {
          if (s === "disconnected") setStatus("idle");
        },
      });

      conversationRef.current = conversation;
      conversation.setMicMuted(true);
      conversation.setVolume({ volume: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start conversation");
      setStatus("idle");
    }
  }

  const endSession = useCallback(() => {
    const conv = conversationRef.current;
    if (!conv) {
      setStatus("idle");
      return;
    }
    conv.setVolume({ volume: 0 });
    conversationRef.current = null;
    setMicOpen(false);
    micOpenRef.current = false;
    setStatus("disconnecting");
    conv.endSession().catch(() => null).finally(() => setStatus("idle"));
  }, []);

  const toggleMic = useCallback(() => {
    const conv = conversationRef.current;
    if (!conv || status !== "connected") return;

    if (micOpenRef.current) {
      conv.setMicMuted(true);
      conv.setVolume({ volume: 1 });
      micOpenRef.current = false;
      setMicOpen(false);
    } else {
      conv.setVolume({ volume: 0 });
      conv.setMicMuted(false);
      micOpenRef.current = true;
      setMicOpen(true);
    }
  }, [status]);

  function handleOpen() {
    setOpen(true);
    setStatus("idle");
    setMessages([]);
    setError(null);
    setMicOpen(false);
    micOpenRef.current = false;
  }

  function handleClose() {
    if (status === "connected" || status === "connecting") {
      endSession();
    }
    setOpen(false);
    setStatus("idle");
  }

  const isAiSpeaking = status === "connected" && mode === "speaking";

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 bg-primary/8 hover:border-primary/50 hover:bg-primary/12 transition-all text-sm font-medium"
      >
        <MessageSquare className="w-4 h-4 text-primary" />
        Talk to Your Swarm
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/60">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              isAiSpeaking
                ? "bg-primary animate-pulse"
                : micOpen
                ? "bg-positive animate-pulse"
                : status === "connected"
                ? "bg-positive"
                : status === "connecting"
                ? "bg-amber-400 animate-pulse"
                : "bg-border",
            )}
          />
          <span className="text-xs font-mono text-muted-foreground">
            {status === "connecting"
              ? "Connecting to swarm..."
              : isAiSpeaking
              ? "Swarm is speaking..."
              : micOpen
              ? "Mic open — swarm is listening"
              : status === "connected"
              ? "SwarmCast Collective — ready"
              : status === "disconnecting"
              ? "Ending session..."
              : "SwarmCast Collective"}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="flex items-center justify-center w-7 h-7 rounded-full border border-border/40 text-muted-foreground hover:border-border hover:text-foreground transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={chatBoxRef} className="h-56 overflow-y-auto p-4 space-y-3">
        {(status === "connecting" || loadingUrl) && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting to your swarm...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-md bg-negative/10 border border-negative/20 text-sm text-negative">
            {error}
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex",
                msg.source === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed",
                  msg.source === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm border border-border/30",
                )}
              >
                {msg.source === "ai" && (
                  <div className="flex items-center gap-1 mb-1">
                    <Radio className="w-2.5 h-2.5 text-primary" />
                    <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                      Swarm Collective
                    </span>
                  </div>
                )}
                {msg.message}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {status === "connected" && messages.length === 0 && !loadingUrl && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              The swarm is ready. Click the mic to speak.
              <br />
              <em className="opacity-60">Try: "Talk to the most opposing voice" or "Who would go viral?"</em>
            </p>
          </div>
        )}
      </div>

      {/* Controls bar */}
      {status === "connected" && (
        <div className="px-4 py-3 border-t border-border/40 flex items-center gap-3">
          <button
            onClick={toggleMic}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border font-medium text-sm transition-all select-none",
              micOpen
                ? "bg-positive/15 border-positive/50 text-positive"
                : isAiSpeaking
                ? "bg-primary/8 border-primary/30 text-primary/70 hover:bg-primary/12"
                : "bg-primary/8 border-primary/30 text-primary hover:bg-primary/12 hover:border-primary/50",
            )}
          >
            {micOpen ? (
              <>
                <Mic className="w-4 h-4 animate-pulse" />
                Mic on — click to stop
              </>
            ) : isAiSpeaking ? (
              <>
                <Volume2 className="w-4 h-4 animate-pulse" />
                Click to interrupt
              </>
            ) : (
              <>
                <MicOff className="w-4 h-4" />
                Click to speak
              </>
            )}
          </button>
          <button
            onClick={endSession}
            title="End session"
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-negative/20 text-negative/60 hover:bg-negative/10 hover:border-negative/40 hover:text-negative transition-all"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
