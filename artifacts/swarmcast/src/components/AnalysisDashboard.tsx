import { FullAnalysis } from "@workspace/api-client-react";
import { AudioPlayer } from "./AudioPlayer";
import { Gauge } from "./ui/gauge";
import { Progress } from "./ui/progress";
import { HistorySidebar } from "./HistorySidebar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ShieldAlert, ShieldCheck, AlertTriangle, ExternalLink, MessageCircle, TrendingUp, AlertCircle, Radio, Search, Users } from "lucide-react";
import { SentimentForecastChart } from "./SentimentForecastChart";
import { PersonaCard } from "./PersonaCard";
import { useState } from "react";

interface AnalysisDashboardProps {
  analysis: FullAnalysis;
  onSelectHistory: (id: string) => void;
  autoPlayMontage?: boolean;
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

  const getRiskColor = (level: string) => {
    switch(level?.toLowerCase()) {
      case 'low': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'high': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth">
        
        {/* Header & Hero */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">{title}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> 
              SwarmCast Analysis Results
            </p>
          </div>

          {montageUrl && (
            <Card className="border-primary/30 bg-card/60 backdrop-blur overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"></div>
              <CardContent className="p-8 relative z-10">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-32 h-32 rounded-full bg-primary/20 border-4 border-primary/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                    <Radio className="w-12 h-12 text-primary animate-pulse" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold mb-2">Focus Group Podcast</h2>
                    <p className="text-muted-foreground mb-6">Listen to the synthesized reaction of 25 AI personas discussing your announcement.</p>
                    <AudioPlayer src={montageUrl} autoPlay={autoPlayMontage} className="max-w-md w-full bg-background/80" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Top metrics grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Swarm Sentiment</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-4">
              <Gauge value={avgSentiment || 0} size={100} />
            </CardContent>
          </Card>

          <Card className="bg-card/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Dominant Emotion</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="text-3xl font-bold capitalize text-primary drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                {dominantEmotion || 'Mixed'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Risk Level</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Badge variant="outline" className={`text-lg px-4 py-2 uppercase tracking-widest ${getRiskColor(riskLevel || 'medium')}`}>
                {riskLevel || 'Medium'} Risk
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-card/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                Viral Potential <TrendingUp className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="py-6">
              <div className="text-4xl font-bold mb-4 text-center">
                {viralPct}%
              </div>
              <Progress value={viralPct} className="h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Summary & Market */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 bg-card/40">
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed text-muted-foreground">
                {swarmSummary}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Market Prediction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium text-lg mb-6">{marketQuestion}</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">No</span>
                    <span className="font-mono text-primary font-bold">{marketPct}% Yes</span>
                  </div>
                  <Progress value={marketPct} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fact Check */}
        {factCheck && (
          <Card className="bg-card/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Reality Check
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-background/50 rounded-lg border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Overall Assessment</span>
                  <Badge variant="outline">{factCheck.accuracyRating}</Badge>
                </div>
                <p className="text-muted-foreground">{factCheck.objectiveAssessment}</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Analyzed Claims</h4>
                {factCheck.factCheckItems?.map((item, i) => (
                  <div key={i} className="flex gap-4 p-3 rounded bg-background/30 border border-border/30">
                    <div className="flex-shrink-0 mt-1">
                      {item.status === 'accurate' ? <ShieldCheck className="w-5 h-5 text-emerald-400" /> :
                       item.status === 'misleading' ? <ShieldAlert className="w-5 h-5 text-rose-400" /> :
                       <AlertTriangle className="w-5 h-5 text-amber-400" />}
                    </div>
                    <div>
                      <p className="font-medium mb-1">"{item.claim}"</p>
                      <p className="text-sm text-muted-foreground">{item.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Web Context */}
        {exaResults && exaResults.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" /> Web Context
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {exaResults.map((result, i) => (
                <a key={i} href={result.url} target="_blank" rel="noopener noreferrer" className="block group">
                  <Card className="h-full bg-card/40 hover:bg-card/80 transition-colors border-border/40 hover:border-primary/30">
                    <CardContent className="p-4 flex flex-col h-full">
                      <h4 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors flex items-start gap-2">
                        <ExternalLink className="w-4 h-4 flex-shrink-0 mt-1 opacity-50 group-hover:opacity-100" />
                        {result.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-3 mt-auto">{result.snippet}</p>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Forecast Chart */}
        {forecastPoints && forecastPoints.length > 0 && (
          <Card className="bg-card/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Sentiment Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SentimentForecastChart points={forecastPoints} />
            </CardContent>
          </Card>
        )}

        {/* Personas Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> 
              Swarm Personas ({personas.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {personas.map((persona, idx) => (
              <PersonaCard 
                key={persona.id} 
                persona={persona} 
                index={idx} 
                isActive={activeAudioId === persona.id}
                onPlay={() => setActiveAudioId(persona.id)}
              />
            ))}
          </div>
        </div>

      </div>

      <div className="w-full lg:w-80 border-l border-border/40 bg-card/20 overflow-y-auto">
        <HistorySidebar onSelectHistory={onSelectHistory} currentId={analysis.id} />
      </div>
    </div>
  );
}
