import { useState } from "react";
import { FullAnalysis, MontageTimelineEntry, ProblemSegment } from "@workspace/api-client-react";
import { AudioPlayer } from "./AudioPlayer";
import { KaraokeMontagePlayer } from "./KaraokeMontagePlayer";
import { HowToImprove } from "./HowToImprove";
import { SwarmChat } from "./SwarmChat";
import { HistorySidebar } from "./HistorySidebar";
import { SentimentForecastChart } from "./SentimentForecastChart";
import { PersonaCard } from "./PersonaCard";
import { Gauge } from "./ui/gauge";
import { motion } from "framer-motion";
import {
  ShieldCheck, ShieldAlert, AlertTriangle, ExternalLink,
  TrendingUp, Radio, Users, ChevronDown, ChevronUp,
  Zap, GitFork, Share2
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
    id,
    title,
    avgSentiment = 0,
    dominantEmotion,
    riskLevel,
    viralPotential = 0,
    consensusForming,
    swarmSummary,
    marketQuestion,
    marketProbability,
    factCheck,
    exaResults = [],
    montageUrl,
    personas = [],
    forecastPoints = [],
    keyThemes,
    narrativeFractures,
    agentId,
    contentSuggestions,
    problemSegments,
    montageTimeline,
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

  const sharingPersonas = personas.filter(p => p.wouldShare);
  const sharingPct = personas.length > 0 ? Math.round((sharingPersonas.length / personas.length) * 100) : 0;

  const themesArr = Array.isArray(keyThemes) ? keyThemes as string[] : [];
  const fracturesArr = Array.isArray(narrativeFractures) ? narrativeFractures as string[] : [];

  const suggestionsArr = Array.isArray(contentSuggestions) ? contentSuggestions as string[] : [];
  const segmentsArr = Array.isArray(problemSegments) ? problemSegments as ProblemSegment[] : [];
  const timelineArr = Array.isArray(montageTimeline) ? montageTimeline as MontageTimelineEntry[] : [];

  const hasKaraokeTimeline = montageUrl && timelineArr.length > 0;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">

      {/* Main scroll area */}
      <div className="flex-1 overflow-y-auto">

        {/* Title banner */}
        <div className="border-b border-border/50 px-6 md:px-10 py-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-2xl md:text-3xl text-foreground leading-tight">{title}</h1>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              <p className="text-xs font-mono text-muted-foreground">
                SwarmCast analysis · {personas.length} personas
                {consensusForming != null && (
                  <span className={`ml-3 inline-flex items-center gap-1 ${consensusForming ? "text-positive" : "text-amber-400"}`}>
                    · {consensusForming ? "Consensus forming" : "Polarised swarm"}
                  </span>
                )}
              </p>
              {agentId && (
                <SwarmChat
                  analysisId={id}
                  agentId={agentId}
                  title={title}
                  personas={personas.map(p => ({
                    id: p.id ?? 0,
                    personaName: p.personaName ?? "",
                    voiceId: p.voiceId ?? null,
                  }))}
                />
              )}
            </div>
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
                      Synthesised reactions from {personas.filter(p => p.audioUrl).length} unique voices discussing your announcement.
                    </p>
                    {hasKaraokeTimeline ? (
                      <KaraokeMontagePlayer
                        src={montageUrl}
                        timeline={timelineArr}
                        autoPlay={autoPlayMontage}
                        className="w-full max-w-2xl"
                      />
                    ) : (
                      <AudioPlayer src={montageUrl} autoPlay={autoPlayMontage} className="w-full max-w-lg" />
                    )}
                  </div>
                </div>
              </Section>
            </motion.div>
          )}

          {/* Key metrics — varied weights */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <Section label="Signal overview">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-border/50 rounded-lg overflow-hidden divide-x divide-y md:divide-y-0 divide-border/50">

                {/* Sentiment gauge */}
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

                {/* Viral potential */}
                <div className="p-6 flex flex-col justify-between">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Viral potential</p>
                  <div className="mt-4">
                    <p className="text-3xl font-semibold tabular-nums">
                      {viralPct}<span className="text-lg text-muted-foreground font-normal">%</span>
                    </p>
                    <div className="mt-2 h-0.5 bg-border rounded-full overflow-hidden w-full">
                      <div className="h-full bg-primary" style={{ width: `${viralPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary metrics row */}
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="flex items-center gap-3 px-4 py-3 rounded-md border border-border/30 bg-card/20">
                  <Share2 className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Would share</p>
                    <p className="text-lg font-semibold tabular-nums mt-0.5">{sharingPct}<span className="text-sm text-muted-foreground font-normal">%</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-md border border-border/30 bg-card/20">
                  <Users className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Personas</p>
                    <p className="text-lg font-semibold tabular-nums mt-0.5">{personas.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-md border border-border/30 bg-card/20">
                  <TrendingUp className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Consensus</p>
                    <p className={`text-sm font-semibold mt-0.5 ${consensusForming ? "text-positive" : "text-amber-400"}`}>
                      {consensusForming == null ? "—" : consensusForming ? "Forming" : "Divided"}
                    </p>
                  </div>
                </div>
              </div>
            </Section>
          </motion.div>

          {/* Summary + market */}
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
                      <span className="text-positive font-medium">Yes</span>
                      <span className="font-mono font-semibold text-primary">{marketPct}%</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${marketPct}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Probability of "Yes"</span>
                      <span>{100 - marketPct}% No</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Prescriptive intelligence */}
          {(suggestionsArr.length > 0 || segmentsArr.length > 0) && (
            <HowToImprove
              contentSuggestions={suggestionsArr}
              problemSegments={segmentsArr}
            />
          )}

          {/* Narrative intelligence — key themes + fractures */}
          {(themesArr.length > 0 || fracturesArr.length > 0) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {themesArr.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Zap className="w-3 h-3" /> Key themes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {themesArr.map((theme, i) => (
                        <span
                          key={i}
                          className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/8 text-foreground/80"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {fracturesArr.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <GitFork className="w-3 h-3" /> Narrative fractures
                    </p>
                    <div className="space-y-2">
                      {fracturesArr.map((fracture, i) => {
                        const parts = fracture.split(" vs. ");
                        return (
                          <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground/80 leading-relaxed">
                            <span className="flex-shrink-0 mt-0.5 font-mono text-muted-foreground/40">{i + 1}.</span>
                            {parts.length === 2 ? (
                              <span>
                                <span className="text-foreground/70">{parts[0]}</span>
                                <span className="text-muted-foreground/50"> vs. </span>
                                <span className="text-foreground/70">{parts[1]}</span>
                              </span>
                            ) : (
                              <span>{fracture}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Fact check */}
          {factCheck && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
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

          {/* Web context */}
          {exaResults && exaResults.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <Section label="Sentiment forecast">
                <div className="border border-border/40 rounded-lg p-4">
                  <SentimentForecastChart points={forecastPoints} />
                </div>
              </Section>
            </motion.div>
          )}

          {/* Personas grid */}
          {personas.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
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
