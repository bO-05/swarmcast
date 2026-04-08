import { Persona } from "@workspace/api-client-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { AudioPlayer } from "./AudioPlayer";
import { motion } from "framer-motion";
import { Progress } from "./ui/progress";
import { Quote } from "lucide-react";

interface PersonaCardProps {
  persona: Persona;
  index: number;
  isActive?: boolean;
  onPlay?: () => void;
}

export function PersonaCard({ persona, index, isActive, onPlay }: PersonaCardProps) {
  const getTypeColor = (type?: string | null) => {
    if (!type) return "bg-slate-500/10 text-slate-400";
    switch (type.toLowerCase()) {
      case "skeptic": return "bg-slate-500/10 text-slate-400 border-slate-500/20";
      case "enthusiast": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "critic": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "concerned": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "influencer": return "bg-violet-500/10 text-violet-400 border-violet-500/20";
      case "institutional": return "bg-teal-500/10 text-teal-400 border-teal-500/20";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const initialSent = persona.initialSentiment ?? 0;
  const finalSent = persona.finalSentiment ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 1) }}
    >
      <Card className={`h-full bg-card/40 border-border/40 hover:border-primary/30 transition-colors overflow-hidden ${isActive ? 'ring-2 ring-primary/50' : ''}`}>
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="font-bold leading-none mb-1">{persona.personaName || "Anonymous"}</h4>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>{persona.age}y</span>
                <span>•</span>
                <span>{persona.country}</span>
                <span>•</span>
                <span>{persona.mbti}</span>
              </div>
            </div>
            <Badge variant="outline" className={`capitalize text-[10px] px-1.5 py-0 h-5 ${getTypeColor(persona.personaType)}`}>
              {persona.personaType || "Unknown"}
            </Badge>
          </div>

          <div className="text-xs text-muted-foreground line-clamp-2 mb-4 bg-background/50 p-2 rounded italic">
            <Quote className="inline w-3 h-3 mr-1 opacity-50" />
            {persona.background}
          </div>

          <div className="space-y-3 mb-4 mt-auto">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
                <span>Initial Sentiment</span>
                <span className={initialSent > 0 ? "text-emerald-400" : initialSent < 0 ? "text-rose-400" : ""}>
                  {initialSent.toFixed(2)}
                </span>
              </div>
              <Progress value={((initialSent + 1) / 2) * 100} className={`h-1.5 ${initialSent > 0 ? '[&>div]:bg-emerald-500' : initialSent < 0 ? '[&>div]:bg-rose-500' : '[&>div]:bg-slate-500'}`} />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
                <span>Final Opinion</span>
                <span className={finalSent > 0 ? "text-emerald-400" : finalSent < 0 ? "text-rose-400" : ""}>
                  {finalSent.toFixed(2)}
                </span>
              </div>
              <Progress value={((finalSent + 1) / 2) * 100} className={`h-1.5 ${finalSent > 0 ? '[&>div]:bg-emerald-500' : finalSent < 0 ? '[&>div]:bg-rose-500' : '[&>div]:bg-slate-500'}`} />
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Key Concern</p>
            <p className="text-sm line-clamp-2 leading-tight">{persona.keyConcern}</p>
          </div>

          {persona.audioUrl ? (
            <div onClick={onPlay}>
              <AudioPlayer src={persona.audioUrl} autoPlay={isActive} className="mt-auto bg-background/50 h-10 w-full" />
            </div>
          ) : (
            <div className="mt-auto h-10 bg-background/30 rounded-full flex items-center justify-center text-xs text-muted-foreground border border-border/30">
              Audio Generating...
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
