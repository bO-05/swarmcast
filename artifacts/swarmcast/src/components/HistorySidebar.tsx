import { useListAnalyses } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { BarChart2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface HistorySidebarProps {
  onSelectHistory: (id: string) => void;
  currentId?: string;
}

export function HistorySidebar({ onSelectHistory, currentId }: HistorySidebarProps) {
  const { data: history = [], isLoading } = useListAnalyses();

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4" />
        Analysis History
      </h3>
      
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-card/40 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((item) => {
            const isActive = item.id === currentId;
            return (
              <button
                key={item.id}
                onClick={() => onSelectHistory(item.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all duration-200",
                  isActive 
                    ? "bg-primary/10 border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                    : "bg-card/30 border-transparent hover:bg-card/60 hover:border-border/50"
                )}
                data-testid={`sidebar-history-${item.id}`}
              >
                <h4 className={cn("text-sm font-medium line-clamp-1 mb-1.5", isActive && "text-primary")}>
                  {item.title}
                </h4>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                  
                  {item.status === 'complete' && item.avgSentiment !== undefined ? (
                    <div className={cn(
                      "px-1.5 py-0.5 rounded flex items-center gap-1 font-mono text-[10px]",
                      item.avgSentiment > 0.1 ? 'bg-emerald-500/10 text-emerald-400' :
                      item.avgSentiment < -0.1 ? 'bg-rose-500/10 text-rose-400' :
                      'bg-slate-500/10 text-slate-400'
                    )}>
                      {item.avgSentiment > 0 ? '+' : ''}{item.avgSentiment.toFixed(2)}
                    </div>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] uppercase tracking-wider">
                      {item.status}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
