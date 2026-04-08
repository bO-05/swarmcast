import { useState, useRef, useEffect, useCallback } from "react";
import { Conversation } from "@11labs/client";
import { Mic, MicOff, X, Radio, Loader2, MessageSquare, PhoneOff, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGetSwarmSignedUrl } from "@workspace/api-client-react";

interface ChatMessage {
  source: "user" | "ai";
  message: string;
  id: number;
  personaName?: string;
}

interface SwarmChatProps {
  analysisId: string;
  agentId: string;
  title: string;
  personas?: Array<{ id: number; personaName: string; voiceId: string | null }>;
}

type ConvStatus = "idle" | "connecting" | "connected" | "disconnecting";

const PERSONA_TAG = /^<<PERSONA:([^>]+)>>/;

const PERSONA_TRIGGER = /\b(talk|speak|hear|connect|channel|put me through|switch|let me talk|i wanna|call)\b.{0,50}\b(persona|voice|most|oldest|youngest|opposing|critical|negative|skeptic|positive|supportive|influential|agree|disagree|different|other)/i;

function normalizeName(n: string) {
  return n.trim().toLowerCase();
}

export function SwarmChat({ analysisId, agentId, title, personas = [] }: SwarmChatProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ConvStatus>("idle");
  const [mode, setMode] = useState<"speaking" | "listening">("listening");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [micOpen, setMicOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePersona, setActivePersona] = useState<string | null>(null);
  const [personaAudioPlaying, setPersonaAudioPlaying] = useState(false);

  const conversationRef = useRef<Conversation | null>(null);
  const msgIdRef = useRef(0);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const micOpenRef = useRef(false);
  const pendingPersonaModeRef = useRef(false);
  const activePersonaRef = useRef<string | null>(null);
  const personaAudioRef = useRef<HTMLAudioElement | null>(null);

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
      stopPersonaAudio();
      const conv = conversationRef.current;
      if (conv) {
        conv.setVolume({ volume: 0 });
        conv.endSession().catch(() => null);
        conversationRef.current = null;
      }
    };
  }, []);

  function stopPersonaAudio() {
    if (personaAudioRef.current) {
      personaAudioRef.current.pause();
      personaAudioRef.current.src = "";
      personaAudioRef.current = null;
      setPersonaAudioPlaying(false);
    }
  }

  function findPersonaVoice(name: string): string | null {
    const norm = normalizeName(name);
    const match = personas.find(p => normalizeName(p.personaName) === norm);
    return match?.voiceId ?? null;
  }

  async function playPersonaVoice(text: string, voiceId: string, personaName: string) {
    stopPersonaAudio();
    conversationRef.current?.setVolume({ volume: 0 });

    try {
      const res = await fetch(`/api/analyses/${analysisId}/persona-speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId }),
      });

      if (!res.ok || !res.body) return;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      personaAudioRef.current = audio;

      setPersonaAudioPlaying(true);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        personaAudioRef.current = null;
        setPersonaAudioPlaying(false);
        if (!micOpenRef.current) {
          conversationRef.current?.setVolume({ volume: 1 });
        }
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        personaAudioRef.current = null;
        setPersonaAudioPlaying(false);
        conversationRef.current?.setVolume({ volume: 1 });
      };

      await audio.play();
    } catch {
      setPersonaAudioPlaying(false);
      conversationRef.current?.setVolume({ volume: 1 });
    }
  }

  async function startSession(signedUrl: string) {
    setStatus("connecting");
    setError(null);
    setMessages([]);
    setMicOpen(false);
    setActivePersona(null);
    setPersonaAudioPlaying(false);
    micOpenRef.current = false;
    pendingPersonaModeRef.current = false;
    activePersonaRef.current = null;
    stopPersonaAudio();

    try {
      const conversation = await Conversation.startSession({
        signedUrl,
        onConnect: () => setStatus("connected"),
        onDisconnect: () => {
          setStatus("idle");
          setMicOpen(false);
          setActivePersona(null);
          micOpenRef.current = false;
          conversationRef.current = null;
          stopPersonaAudio();
        },
        onMessage: ({ message, source }) => {
          if (source === "user") {
            if (PERSONA_TRIGGER.test(message)) {
              pendingPersonaModeRef.current = true;
              conversationRef.current?.setVolume({ volume: 0 });
            }
            setMessages(prev => [...prev, { source, message, id: ++msgIdRef.current }]);
            return;
          }

          const match = PERSONA_TAG.exec(message);
          if (match) {
            const personaName = match[1];
            const speech = message.slice(match[0].length).trim();
            activePersonaRef.current = personaName;
            setActivePersona(personaName);
            pendingPersonaModeRef.current = false;

            setMessages(prev => [
              ...prev,
              { source: "ai", message: speech, id: ++msgIdRef.current, personaName },
            ]);

            const voiceId = findPersonaVoice(personaName);
            if (voiceId && speech) {
              playPersonaVoice(speech, voiceId, personaName);
            } else {
              conversationRef.current?.setVolume({ volume: 1 });
            }
          } else {
            activePersonaRef.current = null;
            setActivePersona(null);
            pendingPersonaModeRef.current = false;
            conversationRef.current?.setVolume({ volume: 1 });
            setMessages(prev => [...prev, { source: "ai", message, id: ++msgIdRef.current }]);
          }
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
            if (!activePersonaRef.current && !pendingPersonaModeRef.current) {
              conversationRef.current?.setVolume({ volume: 1 });
            }
            if (micOpenRef.current) {
              conversationRef.current?.setMicMuted(true);
              micOpenRef.current = false;
              setMicOpen(false);
            }
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
    stopPersonaAudio();
    const conv = conversationRef.current;
    if (!conv) { setStatus("idle"); return; }
    conv.setVolume({ volume: 0 });
    conversationRef.current = null;
    setMicOpen(false);
    micOpenRef.current = false;
    setActivePersona(null);
    setStatus("disconnecting");
    conv.endSession().catch(() => null).finally(() => setStatus("idle"));
  }, []);

  const toggleMic = useCallback(() => {
    const conv = conversationRef.current;
    if (!conv || status !== "connected") return;

    if (micOpenRef.current) {
      conv.setMicMuted(true);
      micOpenRef.current = false;
      setMicOpen(false);
      if (!personaAudioRef.current) {
        conv.setVolume({ volume: 1 });
      }
    } else {
      stopPersonaAudio();
      conv.setVolume({ volume: 0 });
      conv.setMicMuted(false);
      micOpenRef.current = true;
      setMicOpen(true);
    }
  }, [status]);

  const interrupt = useCallback(() => {
    const conv = conversationRef.current;
    if (!conv || status !== "connected") return;
    stopPersonaAudio();
    conv.setVolume({ volume: 0 });
    conv.setMicMuted(false);
    micOpenRef.current = true;
    setMicOpen(true);
    activePersonaRef.current = null;
    setActivePersona(null);
    pendingPersonaModeRef.current = false;
  }, [status]);

  function handleOpen() {
    setOpen(true);
    setStatus("idle");
    setMessages([]);
    setError(null);
    setMicOpen(false);
    setActivePersona(null);
    micOpenRef.current = false;
  }

  function handleClose() {
    if (status === "connected" || status === "connecting") endSession();
    setOpen(false);
    setStatus("idle");
  }

  const isAiSpeaking = status === "connected" && mode === "speaking" && !micOpen;

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
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "w-2 h-2 shrink-0 rounded-full transition-colors",
              personaAudioPlaying
                ? "bg-amber-400 animate-pulse"
                : isAiSpeaking
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
          <span className="text-xs font-mono text-muted-foreground truncate">
            {status === "connecting"
              ? "Connecting to swarm..."
              : personaAudioPlaying
              ? `🎭 ${activePersona} is speaking...`
              : micOpen
              ? "Mic open — swarm listening"
              : activePersona
              ? `Channelling ${activePersona}`
              : isAiSpeaking
              ? "Swarm collective speaking..."
              : status === "connected"
              ? "SwarmCast Collective — ready"
              : status === "disconnecting"
              ? "Ending session..."
              : "SwarmCast Collective"}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="ml-2 shrink-0 flex items-center justify-center w-7 h-7 rounded-full border border-border/40 text-muted-foreground hover:border-border hover:text-foreground transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={chatBoxRef} className="h-60 overflow-y-auto p-4 space-y-3">
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
              className={cn("flex", msg.source === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed",
                  msg.source === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : msg.personaName
                    ? "bg-amber-500/10 text-foreground rounded-bl-sm border border-amber-500/20"
                    : "bg-muted text-foreground rounded-bl-sm border border-border/30",
                )}
              >
                {msg.source === "ai" && (
                  <div className="flex items-center gap-1 mb-1">
                    {msg.personaName ? (
                      <>
                        <span className="text-[9px] font-mono text-amber-400/80 uppercase tracking-widest">
                          🎭 {msg.personaName}
                        </span>
                      </>
                    ) : (
                      <>
                        <Radio className="w-2.5 h-2.5 text-primary" />
                        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                          Swarm Collective
                        </span>
                      </>
                    )}
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
              The swarm is ready. Click <strong>Speak</strong> to talk.
              <br />
              <em className="opacity-60">Try: "Talk to the most opposing voice" or "Who's the oldest skeptic?"</em>
            </p>
          </div>
        )}
      </div>

      {/* Controls — three dedicated buttons */}
      {status === "connected" && (
        <div className="px-4 py-3 border-t border-border/40 flex items-center gap-2">
          {/* Speak toggle */}
          <button
            onClick={toggleMic}
            title={micOpen ? "Close mic" : "Open mic and speak"}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border font-medium text-sm transition-all select-none",
              micOpen
                ? "bg-positive/15 border-positive/50 text-positive"
                : "bg-primary/8 border-primary/30 text-primary hover:bg-primary/12 hover:border-primary/50",
            )}
          >
            {micOpen ? (
              <><Mic className="w-4 h-4 animate-pulse" />Speaking</>
            ) : (
              <><MicOff className="w-4 h-4" />Speak</>
            )}
          </button>

          {/* Interrupt — always visible, silences AI + opens mic */}
          <button
            onClick={interrupt}
            title="Instantly stop AI and take the floor"
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all select-none",
              (isAiSpeaking || personaAudioPlaying)
                ? "bg-amber-500/15 border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                : "bg-muted/40 border-border/30 text-muted-foreground/60 hover:text-muted-foreground hover:border-border/50",
            )}
          >
            <Square className="w-3.5 h-3.5" />
            Stop
          </button>

          {/* End session */}
          <button
            onClick={endSession}
            title="End session"
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-negative/20 text-negative/50 hover:bg-negative/10 hover:border-negative/40 hover:text-negative transition-all"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
