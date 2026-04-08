import { useState, useRef, useEffect } from "react";
import { Conversation } from "@11labs/client";
import { Mic, MicOff, X, Radio, Loader2, MessageSquare } from "lucide-react";
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
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationRef = useRef<Conversation | null>(null);
  const msgIdRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: signedUrlData, isLoading: loadingUrl } = useGetSwarmSignedUrl(analysisId, {
    query: { enabled: open && status === "idle" } as never,
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!open || !signedUrlData?.signedUrl || status !== "idle") return;

    startSession(signedUrlData.signedUrl);
  }, [open, signedUrlData, status]);

  useEffect(() => {
    return () => {
      conversationRef.current?.endSession().catch(() => null);
    };
  }, []);

  async function startSession(signedUrl: string) {
    setStatus("connecting");
    setError(null);
    setMessages([]);

    try {
      const conversation = await Conversation.startSession({
        signedUrl,
        onConnect: () => setStatus("connected"),
        onDisconnect: () => {
          setStatus("idle");
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
        },
        onModeChange: ({ mode: m }) => setMode(m),
        onStatusChange: ({ status: s }) => {
          if (s === "disconnected") setStatus("idle");
        },
      });

      conversationRef.current = conversation;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start conversation");
      setStatus("idle");
    }
  }

  function endSession() {
    setStatus("disconnecting");
    conversationRef.current?.endSession().catch(() => null);
    conversationRef.current = null;
    setStatus("idle");
  }

  function toggleMic() {
    if (!conversationRef.current) return;
    const newMuted = !isMicMuted;
    conversationRef.current.setMicMuted(newMuted);
    setIsMicMuted(newMuted);
  }

  function handleOpen() {
    setOpen(true);
    setStatus("idle");
    setMessages([]);
    setError(null);
  }

  function handleClose() {
    if (status === "connected" || status === "connecting") {
      endSession();
    }
    setOpen(false);
    setStatus("idle");
  }

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
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/60">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              status === "connected"
                ? mode === "speaking"
                  ? "bg-primary animate-pulse"
                  : "bg-positive"
                : status === "connecting"
                ? "bg-amber-400 animate-pulse"
                : "bg-border",
            )}
          />
          <span className="text-xs font-mono text-muted-foreground">
            {status === "connecting"
              ? "Connecting to swarm..."
              : status === "connected"
              ? mode === "speaking"
                ? "Swarm is speaking..."
                : "Listening..."
              : status === "disconnecting"
              ? "Disconnecting..."
              : "SwarmCast Collective"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {status === "connected" && (
            <button
              onClick={toggleMic}
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full border transition-all",
                isMicMuted
                  ? "border-negative/40 bg-negative/10 text-negative"
                  : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-7 h-7 rounded-full border border-border/40 text-muted-foreground hover:border-border hover:text-foreground transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="h-64 overflow-y-auto p-4 space-y-3">
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
              The swarm is ready. Ask about "{title}" — try{" "}
              <em>"Which persona worried most?"</em> or{" "}
              <em>"Why might this go viral?"</em>
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {status === "connected" && (
        <div className="px-4 py-3 border-t border-border/40 flex items-center justify-between gap-3">
          <p className="text-[10px] font-mono text-muted-foreground">
            Speak into your microphone to ask the swarm
          </p>
          <button
            onClick={endSession}
            className="text-[10px] font-mono text-muted-foreground hover:text-negative transition-colors"
          >
            End session
          </button>
        </div>
      )}
    </motion.div>
  );
}
