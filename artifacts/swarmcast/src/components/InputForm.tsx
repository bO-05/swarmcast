import { useState } from "react";
import { useCreateAnalysis, useListAnalyses } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Activity, Clock, BarChart2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface InputFormProps {
  onCreateComplete: (id: string) => void;
  onSelectHistory: (id: string) => void;
}

export function InputForm({ onCreateComplete, onSelectHistory }: InputFormProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  
  const createAnalysis = useCreateAnalysis();
  const { data: history = [], isLoading: isLoadingHistory } = useListAnalyses();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !text) return;
    
    createAnalysis.mutate(
      { data: { title, text } },
      {
        onSuccess: (data) => {
          onCreateComplete(data.id);
        }
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">Give your announcement <br/><span className="text-primary text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">25 voices</span></h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Simulate public reaction before you hit send. We generate 25 unique AI personas, craft authentic audio responses, and build a focus group montage in real-time.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="border-primary/20 bg-card/40 backdrop-blur-sm shadow-[0_0_30px_rgba(59,130,246,0.1)]">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium mb-2">Announcement Title</label>
                  <Input 
                    id="title"
                    placeholder="e.g. Acme Corp Acquires Globex" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-lg py-6 bg-background/50"
                    disabled={createAnalysis.isPending}
                    data-testid="input-title"
                  />
                </div>
                <div>
                  <label htmlFor="text" className="block text-sm font-medium mb-2">Document Content</label>
                  <Textarea 
                    id="text"
                    placeholder="Paste your press release, memo, or announcement text here..." 
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="min-h-[300px] text-base bg-background/50 resize-y"
                    disabled={createAnalysis.isPending}
                    data-testid="input-text"
                  />
                </div>
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full text-lg h-14 relative overflow-hidden group"
                  disabled={!title || !text || createAnalysis.isPending}
                  data-testid="button-submit-analysis"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-cyan-500 to-primary opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative flex items-center gap-2">
                    {createAnalysis.isPending ? (
                      <>
                        <Activity className="animate-pulse" />
                        Initializing Swarm...
                      </>
                    ) : (
                      <>
                        <Activity />
                        Analyze with SwarmCast
                      </>
                    )}
                  </span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h3 className="font-semibold text-lg flex items-center gap-2 px-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Recent Analyses
          </h3>
          
          {isLoadingHistory ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-card/40 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-3">
              {history.map((item) => (
                <Card 
                  key={item.id} 
                  className="bg-card/40 hover:bg-card/80 transition-colors cursor-pointer border-border/40"
                  onClick={() => onSelectHistory(item.id)}
                  data-testid={`card-history-${item.id}`}
                >
                  <CardContent className="p-4">
                    <h4 className="font-medium line-clamp-1 mb-2">{item.title}</h4>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                      {item.status === 'complete' && item.avgSentiment != null && (
                        <div className={`px-2 py-1 rounded-full flex items-center gap-1 ${
                          item.avgSentiment > 0.1 ? 'bg-emerald-500/10 text-emerald-400' :
                          item.avgSentiment < -0.1 ? 'bg-rose-500/10 text-rose-400' :
                          'bg-slate-500/10 text-slate-400'
                        }`}>
                          <BarChart2 className="w-3 h-3" />
                          {item.avgSentiment > 0 ? '+' : ''}{item.avgSentiment.toFixed(2)}
                        </div>
                      )}
                      {item.status !== 'complete' && (
                        <span className="text-primary px-2 py-1 bg-primary/10 rounded-full">{item.status}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-card/20 rounded-lg border border-dashed border-border/40 text-muted-foreground">
              No recent analyses found.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
