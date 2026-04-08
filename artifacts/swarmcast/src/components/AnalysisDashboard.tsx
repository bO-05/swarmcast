import { useState } from "react";
import { FullAnalysis } from "@workspace/api-client-react";
import { AudioPlayer } from "./AudioPlayer";
import { HistorySidebar } from "./HistorySidebar";
import { SentimentForecastChart } from "./SentimentForecastChart";
import { PersonaCard } from "./PersonaCard";
import { Gauge } from "./ui/gauge";
import { motion } from "framer-motion";
import {
  ShieldCheck, ShieldAlert, AlertTriangle, ExternalLink,
  TrendingUp, Radio, Search, Users, ChevronDown, ChevronUp
} from "lucide-react";

interface AnalysisDashboardProps {
  analysis: FullAnalysis;
  onSelectHistory: (id: string) => void;
  autoPlayMontage?: boolean;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
        {label}
      </p>
      {children}
    </section>
  );
}

export function AnalysisDashboard({ analysis, onSelectHistory, autoPlayMontage = false }: AnalysisDashboardProps) {
  const {
    title,
    avgSentiment = 0,
    dominantEmotion,
    riskLevel,
    viralPotential = 0,
    swarmSummary,
    marketQuestion,
    marketProbability,
    factCheck,
    exaResults = [],
    montageUrl,
    personas = [],
    forecastPoints = []
  } = analysis;

  const viralPct = Math.round((viralPotential ?? 0) * 100);
  const marketPct = Math.round((marketProbability ?? 0) * 100);

  const [activeAudioId, setActiveAudioId] = useState<number | null>(null);
  const [showAllPersonas, setShowAllPersonas] = useState(false);

  const displayedPersonas = showAllPersonas ? personas : personas.slice(0, 12);

  const riskStyles: Record<string, string> = {
    low:    "text-positive border-positive/30 bg-[color-mix(in_oklch,var(--positive)_8%,transparent)]",
    medium: "text-amber-400 border-amber-500/30 bg-amber-500/8",
    high:   "text-negative border-negative/30 bg-[color-mix(in_oklch,var(--negative)_8%,transparent)]",
  };
  const riskClass = riskStyles[(riskLevel || "medium").toLowerCase()] ?? riskStyles.medium;

  const avgSentVal = avgSentiment ?? 0;
  const sentimentLabel =
    avgSentVal > 0.3 ? "Positive" :
    avgSentVal < -0.3 ? "Negative" : "Mixed";

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">

      {/* Main scroll area */}
      <div className="flex-1 overflow-y-auto">

        {/* Title banner */}
        <div className="border-b border-border/50 px-6 md:px-10 py-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-2xl md:text-3xl text-foreground leading-tight">{title}</h1>
            <p className="text-xs font-mono text-muted-foreground mt-1">SwarmCast analysis · {personas.length} personas</p>
          </motion.div>
        </div>

        <div className="px-6 md:px-10 py-8 space-y-12 max-w-5xl">

          {/* Podcast player */}
          {montageUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Section label="Focus Group Podcast">
                <div className="flex items-center gap-6 py-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                    <Radio className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-3">
                      Synthesized reaction of {personas.filter(p => p.audioUrl).length} voices discussing your announcement.
                    </p>
                    <AudioPlayer src={montageUrl} autoPlay={autoPlayMontage} className="w-full max-w-lg" />
                  </div>
                </div>
              </Section>
            </motion.div>
          )}

          {/* Key metrics — varied weights, not identical cards */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <Section label="Signal overview">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-border/50 rounded-lg overflow-hidden divide-x divide-y md:divide-y-0 divide-border/50">

                {/* Sentiment gauge — larger */}
                <div className="col-span-2 md:col-span-1 p-6 flex flex-col items-center gap-3">
                  <Gauge value={avgSentVal} size={90} />
                  <div className="text-center">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Sentiment</p>
                    <p className="text-sm font-medium mt-0.5">{sentimentLabel}</p>
                  </div>
                </div>

                {/* Dominant emotion */}
                <div className="p-6 flex flex-col justify-between">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Dominant</p>
                  <p className="font-display text-2xl capitalize mt-4">{dominantEmotion || "Mixed"}</p>
                </div>

                {/* Risk */}
                <div className="p-6 flex flex-col justify-between">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Risk</p>
                  <div className={`mt-4 inline-flex self-start items-center px-2.5 py-1 rounded border text-xs font-medium capitalize ${riskClass}`}>
                    {riskLevel || "Medium"}
                  </div>
                </div>

                {/* Viral */}
                <div className="p-6 flex flex-col justify-between">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Viral potential</p>
                  <div className="mt-4">
                    <p className="text-3xl font-semibold tabular-nums">{viralPct}<span className="text-lg text-muted-foreground font-normal">%</span></p>
                    <div className="mt-2 h-0.5 bg-border rounded-full overflow-hidden w-full">
                      <div className="h-full bg-primary" style={{ width: `${viralPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </Section>
          </motion.div>

          {/* Summary + market — different widths, left-right contrast */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-3">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Executive summary</p>
                <p className="text-base leading-relaxed text-foreground/80">{swarmSummary}</p>
              </div>

              {marketQuestion && (
                <div className="space-y-3">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Market prediction</p>
                  <p className="text-sm font-medium leading-snug">{marketQuestion}</p>
                  <div className="space-y-1.5 mt-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">No</span>
                      <span className="font-mono font-semibold text-primary">{marketPct}%</span>
                    </div>
                    <div className="h-1 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${marketPct}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Probability of "Yes"</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Fact check */}
          {factCheck && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
              <Section label="Reality check">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4 pb-3 border-b border-border/40">
                    <p className="text-sm text-muted-foreground leading-relaxed">{factCheck.objectiveAssessment}</p>
                    <span className="flex-shrink-0 text-xs font-mono text-muted-foreground border border-border/50 px-2 py-0.5 rounded">
                      {factCheck.accuracyRating}
                    </span>
                  </div>
                  {factCheck.factCheckItems?.map((item, i) => (
                    <div key={i} className="flex gap-3 py-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {item.status === "accurate" ? (
                          <ShieldCheck className="w-4 h-4 text-positive" />
                        ) : item.status === "misleading" ? (
                          <ShieldAlert className="w-4 h-4 text-negative" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-0.5">"{item.claim}"</p>
                        <p className="text-xs text-muted-foreground">{item.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </motion.div>
          )}

          {/* Web context — horizontal scroll, no same-size card grid */}
          {exaResults && exaResults.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <Section label="Web context">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {exaResults.map((result, i) => (
                    <a
                      key={i}
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex gap-3 p-3 rounded-md border border-border/30 hover:border-border hover:bg-card/40 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                          {result.title}
                        </p>
                        <p className="text-xs text-muted-foreground/60 line-clamp-2 mt-1">{result.snippet}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </Section>
            </motion.div>
          )}

          {/* Forecast chart */}
          {forecastPoints && forecastPoints.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
              <Section label="Sentiment forecast">
                <div className="border border-border/40 rounded-lg p-4">
                  <SentimentForecastChart points={forecastPoints} />
                </div>
              </Section>
            </motion.div>
          )}

          {/* Personas */}
          {personas.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <Section label={`Swarm personas · ${personas.length}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {displayedPersonas.map((persona, idx) => (
                    <PersonaCard
                      key={persona.id}
                      persona={persona}
                      index={idx}
                      isActive={activeAudioId === persona.id}
                      onPlay={() => setActiveAudioId(persona.id)}
                      pipelineComplete={true}
                    />
                  ))}
                </div>

                {personas.length > 12 && (
                  <button
                    onClick={() => setShowAllPersonas(v => !v)}
                    className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
                  >
                    {showAllPersonas ? (
                      <><ChevronUp className="w-3.5 h-3.5" /> Show fewer</>
                    ) : (
                      <><ChevronDown className="w-3.5 h-3.5" /> Show all {personas.length} personas</>
                    )}
                  </button>
                )}
              </Section>
            </motion.div>
          )}

          <div className="h-12" />
        </div>
      </div>

      {/* Sidebar */}
      <div className="hidden xl:block w-56 border-l border-border/50 overflow-y-auto flex-shrink-0">
        <HistorySidebar onSelectHistory={onSelectHistory} currentId={analysis.id} />
      </div>
    </div>
  );
}
