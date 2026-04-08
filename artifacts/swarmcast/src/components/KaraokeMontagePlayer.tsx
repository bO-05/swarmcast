import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface AlignmentWord {
  word: string;
  start: number;
  end: number;
}

interface TimelineEntry {
  personaId?: number | null;
  personaName: string;
  startSec: number;
  endSec: number;
  script: string;
  sentiment?: number | null;
  words?: AlignmentWord[] | null;
}

interface KaraokeMontagePlayerProps {
  src: string;
  timeline: TimelineEntry[];
  autoPlay?: boolean;
  className?: string;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function KaraokeMontagePlayer({
  src,
  timeline,
  autoPlay = false,
  className,
}: KaraokeMontagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    if (autoPlay) {
      audioRef.current.play().catch(() => null);
    }
  }, [autoPlay]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * duration;
  };

  const seekTo = (sec: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = sec;
    audioRef.current.play();
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  const activeEntry = timeline.find(
    (e) => currentTime >= e.startSec && currentTime < e.endSec,
  );

  return (
    <div className={cn("space-y-4", className)}>
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex-shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        <div
          className="flex-1 group relative h-5 flex items-center cursor-pointer"
          onClick={handleSeek}
        >
          <div className="w-full h-1 bg-border rounded-full overflow-hidden relative">
            {timeline.map((entry, i) => (
              <div
                key={i}
                className={cn(
                  "absolute top-0 h-full opacity-30",
                  entry.personaId == null ? "bg-muted-foreground" : "bg-primary",
                )}
                style={{
                  left: `${(entry.startSec / (duration || 1)) * 100}%`,
                  width: `${((entry.endSec - entry.startSec) / (duration || 1)) * 100}%`,
                }}
              />
            ))}
            <div
              className="absolute top-0 left-0 h-full bg-primary transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ left: `calc(${progress}% - 5px)` }}
          />
        </div>

        <span className="text-[10px] font-mono text-muted-foreground w-20 text-right flex-shrink-0">
          {formatTime(currentTime)} / {duration ? formatTime(duration) : "--:--"}
        </span>

        <button
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.muted = !isMuted;
              setIsMuted((v) => !v);
            }
          }}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeEntry ? (
          <motion.div
            key={activeEntry.personaName}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="p-4 rounded-lg border border-primary/20 bg-primary/5 min-h-[80px]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-primary uppercase tracking-widest">
                  <Radio className="w-3 h-3 animate-pulse" />
                  Now speaking
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {activeEntry.personaName}
                </span>
              </div>
              {activeEntry.sentiment != null && (
                <span
                  className={cn(
                    "text-[9px] font-mono px-1.5 py-0.5 rounded border tabular-nums",
                    activeEntry.sentiment > 0.2
                      ? "text-positive border-positive/30 bg-[color-mix(in_oklch,var(--positive)_8%,transparent)]"
                      : activeEntry.sentiment < -0.2
                      ? "text-negative border-negative/30 bg-[color-mix(in_oklch,var(--negative)_8%,transparent)]"
                      : "text-amber-400 border-amber-500/30 bg-amber-500/8",
                  )}
                >
                  {activeEntry.sentiment > 0 ? "+" : ""}
                  {activeEntry.sentiment.toFixed(2)}
                </span>
              )}
            </div>

            <div className="text-sm leading-relaxed">
              {activeEntry.words && activeEntry.words.length > 0 ? (
                activeEntry.words.map((w, i) => {
                  const relTime = currentTime - activeEntry.startSec;
                  const isActive = relTime >= w.start && relTime < w.end;
                  const isPast = relTime >= w.end;
                  return (
                    <span
                      key={i}
                      className={cn(
                        "transition-colors duration-150",
                        isActive
                          ? "text-primary font-semibold"
                          : isPast
                          ? "text-foreground/70"
                          : "text-foreground/30",
                      )}
                    >
                      {w.word}{" "}
                    </span>
                  );
                })
              ) : (
                <p className="text-foreground/70 italic">{activeEntry.script}</p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-lg border border-border/30 bg-card/20 min-h-[80px] flex items-center justify-center"
          >
            <p className="text-xs text-muted-foreground font-mono">
              {isPlaying ? "Between speakers..." : "Press play to start"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {timeline.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {timeline.map((entry, i) => {
            const isActive =
              currentTime >= entry.startSec && currentTime < entry.endSec;
            return (
              <button
                key={i}
                onClick={() => seekTo(entry.startSec)}
                className={cn(
                  "text-[9px] font-mono px-2 py-1 rounded border transition-all",
                  isActive
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : entry.personaId == null
                    ? "border-border/30 text-muted-foreground/50 hover:border-border hover:text-muted-foreground"
                    : "border-border/30 text-muted-foreground/60 hover:border-border/60 hover:text-muted-foreground",
                )}
              >
                {entry.personaId == null ? "intro" : entry.personaName.split(" ")[0]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
