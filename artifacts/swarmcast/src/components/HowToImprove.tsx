import { motion } from "framer-motion";
import { Lightbulb, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface ProblemSegment {
  quote: string;
  triggeredBy: string[];
  reason: string;
}

interface HowToImproveProps {
  contentSuggestions: string[];
  problemSegments: ProblemSegment[];
}

export function HowToImprove({ contentSuggestions, problemSegments }: HowToImproveProps) {
  const [expanded, setExpanded] = useState(false);

  if (contentSuggestions.length === 0 && problemSegments.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.35 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <Lightbulb className="w-3 h-3" />
          Prescriptive intelligence
        </p>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="w-3 h-3" /> Collapse</>
          ) : (
            <><ChevronDown className="w-3 h-3" /> Expand</>
          )}
        </button>
      </div>

      {!expanded ? (
        <div
          className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 cursor-pointer hover:border-amber-500/40 transition-colors"
          onClick={() => setExpanded(true)}
        >
          <p className="text-xs text-muted-foreground">
            <span className="text-amber-400 font-medium">{problemSegments.length} friction point{problemSegments.length !== 1 ? "s" : ""}</span>
            {" "}identified · {" "}
            <span className="text-positive font-medium">{contentSuggestions.length} improvement{contentSuggestions.length !== 1 ? "s" : ""}</span>
            {" "}recommended — click to expand
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {problemSegments.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                Friction points
              </p>
              <div className="space-y-3">
                {problemSegments.map((seg, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2"
                  >
                    <p className="text-sm italic text-foreground/80 border-l-2 border-amber-500/40 pl-3">
                      "{seg.quote}"
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {seg.reason}
                    </p>
                    {seg.triggeredBy && seg.triggeredBy.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {seg.triggeredBy.map((name, j) => (
                          <span
                            key={j}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/20"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {contentSuggestions.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Lightbulb className="w-3 h-3 text-positive" />
                Suggested improvements
              </p>
              <div className="space-y-2">
                {contentSuggestions.map((suggestion, i) => (
                  <div
                    key={i}
                    className="flex gap-3 p-4 rounded-lg border border-positive/20 bg-[color-mix(in_oklch,var(--positive)_5%,transparent)]"
                  >
                    <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-positive/15 flex items-center justify-center text-[9px] font-mono font-bold text-positive">
                      {i + 1}
                    </span>
                    <p className="text-sm text-foreground/80 leading-relaxed">{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
