import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src: string;
  autoPlay?: boolean;
  className?: string;
  compact?: boolean;
}

export function AudioPlayer({ src, autoPlay = false, className, compact = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    if (autoPlay) {
      audioRef.current.play().catch(() => null);
    } else {
      audioRef.current.pause();
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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const elapsed = duration ? (progress / 100) * duration : 0;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); setProgress(0); }}
        onTimeUpdate={() => {
          if (audioRef.current?.duration) {
            setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
      />

      <button
        onClick={togglePlay}
        data-testid="button-play-audio"
        className={cn(
          "flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-150",
          "bg-primary text-primary-foreground hover:opacity-90 active:scale-95",
          compact ? "w-7 h-7" : "w-9 h-9"
        )}
      >
        {isPlaying
          ? <Pause className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
          : <Play className={cn(compact ? "w-3 h-3 ml-0.5" : "w-4 h-4 ml-0.5")} />
        }
      </button>

      <div
        className="flex-1 group relative h-5 flex items-center cursor-pointer"
        onClick={handleSeek}
      >
        <div className="w-full h-0.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `calc(${progress}% - 4px)` }}
        />
      </div>

      {!compact && (
        <>
          <span className="text-[10px] font-mono text-muted-foreground w-10 text-right flex-shrink-0">
            {duration ? formatTime(elapsed) : "--:--"}
          </span>
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.muted = !isMuted;
                setIsMuted(v => !v);
              }
            }}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </>
      )}
    </div>
  );
}
