import { useState } from "react";
import { useCreateAnalysis, useListAnalyses } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Loader2 } from "lucide-react";

interface InputFormProps {
  onCreateComplete: (id: string) => void;
  onSelectHistory: (id: string) => void;
}

const sentimentBar = (val: number | null | undefined) => {
  if (val == null) return null;
  const pct = Math.round(((val + 1) / 2) * 100);
  const color = val > 0.1 ? "var(--positive)" : val < -0.1 ? "var(--negative)" : "var(--neutral-sentiment)";
  return { pct, color };
};

export function InputForm({ onCreateComplete, onSelectHistory }: InputFormProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  const createAnalysis = useCreateAnalysis();
  const { data: history = [], isLoading: isLoadingHistory } = useListAnalyses();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return;
    createAnalysis.mutate(
      { data: { title, text } },
      { onSuccess: (data) => onCreateComplete(data.id) }
    );
  };

  const isPending = createAnalysis.isPending;

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 min-h-[calc(100vh-3.5rem)]">

        {/* Left: editorial statement */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex lg:col-span-2 flex-col justify-between p-12 xl:p-16 border-r border-border/50"
        >
          <div className="space-y-8">
            <div className="inline-block text-xs font-mono text-muted-foreground uppercase tracking-widest border border-border/60 rounded px-2 py-1">
              Public sentiment engine
            </div>

            <div>
              <h1 className="font-display text-5xl xl:text-6xl leading-[1.05] text-foreground">
                Give your<br />
                announcement<br />
                <em className="text-primary not-italic">25 voices.</em>
              </h1>
            </div>

            <p className="text-muted-foreground text-base leading-relaxed max-w-xs">
              Simulate public reaction before you send. SwarmCast generates 25 unique AI personas, crafts authentic audio, and builds a focus group podcast — in real time.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Powered by</p>
            <div className="flex flex-wrap gap-2">
              {["Mistral", "ElevenLabs", "Perplexity", "Exa"].map(name => (
                <span key={name} className="text-xs font-mono text-muted-foreground border border-border/40 rounded px-2 py-1">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right: form + history */}
        <div className="lg:col-span-3 flex flex-col">

          {/* Mobile heading */}
          <div className="lg:hidden px-6 pt-10 pb-6">
            <h1 className="font-display text-4xl leading-tight">
              Give your announcement <em className="text-primary not-italic">25 voices.</em>
            </h1>
          </div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex-1 flex flex-col p-6 lg:p-12 xl:p-16 gap-6"
          >
            <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
              <div className="space-y-1.5">
                <label htmlFor="title" className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  Announcement title
                </label>
                <input
                  id="title"
                  type="text"
                  placeholder="e.g. Acme Corp Acquires Globex"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isPending}
                  data-testid="input-title"
                  className="w-full bg-card border border-border/60 rounded-md px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="text" className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  Document content
                </label>
                <textarea
                  id="text"
                  placeholder="Paste your press release, memo, or announcement text here..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={isPending}
                  rows={10}
                  data-testid="input-text"
                  className="w-full bg-card border border-border/60 rounded-md px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-y disabled:opacity-50 min-h-[220px]"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full font-medium"
                disabled={!title.trim() || !text.trim() || isPending}
                data-testid="button-submit-analysis"
              >
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Initializing swarm…
                  </>
                ) : (
                  <>
                    Run SwarmCast
                    <ArrowRight className="ml-1" />
                  </>
                )}
              </Button>

              {createAnalysis.isError && (
                <p className="text-sm text-destructive text-center">
                  Failed to start analysis. Please try again.
                </p>
              )}
            </form>
          </motion.div>

          {/* Recent analyses */}
          {(isLoadingHistory || history.length > 0) && (
            <div className="border-t border-border/50 p-6 lg:px-12 xl:px-16">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">
                Recent analyses
              </p>

              {isLoadingHistory ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-12 bg-card/40 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1 max-w-xl">
                  {history.map((item) => {
                    const bar = sentimentBar(item.avgSentiment);
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSelectHistory(item.id)}
                        data-testid={`card-history-${item.id}`}
                        className="w-full flex items-center gap-4 px-3 py-2.5 rounded-md hover:bg-card/60 transition-colors text-left group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {item.status === "complete" && bar ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${bar.pct}%`, background: bar.color }}
                                />
                              </div>
                              <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                                {item.avgSentiment! > 0 ? "+" : ""}{item.avgSentiment!.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-muted-foreground">
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
          )}

          {/* Empty state */}
          {!isLoadingHistory && history.length === 0 && (
            <div className="border-t border-border/50 px-6 lg:px-12 xl:px-16 py-8">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
                Recent analyses
              </p>
              <p className="text-sm text-muted-foreground/60 italic">
                Your analyses will appear here after you run SwarmCast.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
