import { useListAnalyses } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface HistorySidebarProps {
  onSelectHistory: (id: string) => void;
  currentId?: string;
}

export function HistorySidebar({ onSelectHistory, currentId }: HistorySidebarProps) {
  const { data: history = [], isLoading } = useListAnalyses();

  return (
    <div className="p-5">
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
        History
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-card/40 rounded animate-pulse" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <p className="text-xs text-muted-foreground/50 italic">No analyses yet.</p>
      ) : (
        <div className="space-y-0.5">
          {history.map((item) => {
            const isActive = item.id === currentId;
            const sentiment = item.avgSentiment;
            const sentimentColor =
              sentiment == null ? undefined :
              sentiment > 0.1 ? "var(--positive)" :
              sentiment < -0.1 ? "var(--negative)" :
              "var(--neutral-sentiment)";

            return (
              <button
                key={item.id}
                onClick={() => onSelectHistory(item.id)}
                data-testid={`sidebar-history-${item.id}`}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-md transition-colors",
                  isActive
                    ? "bg-primary/10 text-foreground"
                    : "hover:bg-card/60 text-foreground/70 hover:text-foreground"
                )}
              >
                <p className={cn("text-xs font-medium line-clamp-1 mb-1", isActive && "text-primary")}>
                  {item.title}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </span>
                  {item.status === "complete" && sentiment != null ? (
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: sentimentColor }}
                    >
                      {sentiment > 0 ? "+" : ""}{sentiment.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-muted-foreground/50">
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
