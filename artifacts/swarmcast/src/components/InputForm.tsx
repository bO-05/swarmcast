import { useState, useRef, useCallback } from "react";
import { useCreateAnalysis, useListAnalyses } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Loader2, Sparkles, Link2, FileText, AlignLeft, UploadCloud, X, AlertCircle } from "lucide-react";

const EXAMPLE_TITLE = "OpenAI GPT-5 Launch";
const EXAMPLE_TEXT = `OpenAI has officially announced the launch of GPT-5, describing it as the most capable AI model ever deployed commercially. The model demonstrates PhD-level reasoning across science, mathematics, law, and medicine, outperforming human experts on several established benchmarks.

GPT-5 will be available via API immediately at $0.015 per 1,000 input tokens and $0.06 per 1,000 output tokens. A consumer-facing version arrives in ChatGPT Plus next month. Built-in web search, image analysis, and code execution are included at no extra cost.

CEO Sam Altman stated that GPT-5 represents "a turning point in human civilisation," while critics from the AI safety community warn the model's capabilities significantly outpace existing safety frameworks. Several hundred enterprise contracts have already been signed, including Fortune 500 companies in healthcare, finance, and legal services.

Preliminary studies suggest GPT-5 could automate up to 30% of knowledge work tasks within five years. Labour economists are divided on whether this represents a productivity boom or a structural unemployment risk. Climate researchers note the model's training consumed an estimated 12 gigawatt-hours of electricity.`;

type InputMode = "text" | "url" | "file";

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

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).href;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    pages.push(pageText);
  }

  return pages.join("\n\n");
}

export function InputForm({ onCreateComplete, onSelectHistory }: InputFormProps) {
  const [mode, setMode] = useState<InputMode>("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  // URL mode state
  const [urlInput, setUrlInput] = useState("");
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlFetched, setUrlFetched] = useState(false);

  // File mode state
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createAnalysis = useCreateAnalysis();
  const { data: history = [], isLoading: isLoadingHistory } = useListAnalyses();

  const loadExample = () => {
    setMode("text");
    setTitle(EXAMPLE_TITLE);
    setText(EXAMPLE_TEXT);
    setUrlFetched(false);
    setFileName(null);
  };

  const handleFetchUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setIsFetchingUrl(true);
    setUrlError(null);
    setUrlFetched(false);
    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json() as { title?: string; text?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to fetch URL");
      if (data.title && !title) setTitle(data.title);
      setText(data.text ?? "");
      setUrlFetched(true);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Could not fetch URL");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const processFile = useCallback(async (file: File) => {
    setFileError(null);
    setFileName(file.name);
    setIsParsingFile(true);
    try {
      let extracted = "";
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        extracted = await extractPdfText(file);
      } else {
        extracted = await file.text();
      }
      if (!extracted.trim()) throw new Error("No text content found in file");
      setText(extracted.trim());
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Could not read file");
      setFileName(null);
    } finally {
      setIsParsingFile(false);
    }
  }, [title]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  };

  const clearFile = () => {
    setFileName(null);
    setText("");
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return;
    createAnalysis.mutate(
      { data: { title, text } },
      { onSuccess: (data) => onCreateComplete(data.id) }
    );
  };

  const isPending = createAnalysis.isPending;

  const modes: { id: InputMode; label: string; icon: React.ReactNode }[] = [
    { id: "text", label: "Paste text", icon: <AlignLeft className="w-3.5 h-3.5" /> },
    { id: "url", label: "From URL", icon: <Link2 className="w-3.5 h-3.5" /> },
    { id: "file", label: "Upload file", icon: <FileText className="w-3.5 h-3.5" /> },
  ];

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
              Paste any announcement and hear how the world reacts — before you hit publish. SwarmCast spins up 25 distinct AI personas, fact-checks your content against live web discourse, then uses <span className="text-foreground font-medium">ElevenLabs</span> to give each persona a unique human voice and assemble a listenable focus group podcast.
            </p>

            <div className="space-y-3 max-w-xs">
              {[
                { step: "01", label: "Paste a doc, URL, or PDF" },
                { step: "02", label: "25 AI personas analyze & react" },
                { step: "03", label: "ElevenLabs voices each persona" },
                { step: "04", label: "Listen to your Focus Group Podcast" },
              ].map(({ step, label }) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-primary/60 w-5 flex-shrink-0">{step}</span>
                  <span className="text-sm text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Accepts</p>
              <div className="flex flex-wrap gap-2">
                {["News articles", "Press releases", "PDFs", "Any URL", "Plain text"].map(name => (
                  <span key={name} className="text-xs font-mono text-muted-foreground border border-border/40 rounded px-2 py-1">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Powered by</p>
              <div className="flex flex-wrap gap-2">
                {["Mistral", "ElevenLabs", "Perplexity", "Exa"].map(name => (
                  <span key={name} className={`text-xs font-mono border rounded px-2 py-1 ${name === "ElevenLabs" ? "text-primary border-primary/40 bg-primary/5" : "text-muted-foreground border-border/40"}`}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">Built &amp; hosted on</span>
              <span className="text-xs font-mono text-muted-foreground border border-border/40 rounded px-2 py-1 bg-card/60">
                Replit
              </span>
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

              {/* Title */}
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

              {/* Mode tabs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 bg-card border border-border/60 rounded-lg p-1">
                    {modes.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMode(m.id)}
                        disabled={isPending}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all ${
                          mode === m.id
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {m.icon}
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {!isPending && (
                    <button
                      type="button"
                      onClick={loadExample}
                      className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60 hover:text-primary transition-colors uppercase tracking-widest"
                    >
                      <Sparkles className="w-3 h-3" />
                      Try example
                    </button>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {/* TEXT MODE */}
                  {mode === "text" && (
                    <motion.div
                      key="text"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-1"
                    >
                      <div className="flex justify-end">
                        <span className="text-[10px] font-mono text-muted-foreground/40">
                          {text.length > 0 ? `${text.length} chars` : ""}
                        </span>
                      </div>
                      <textarea
                        id="text"
                        placeholder="Paste your press release, memo, blog post, or any announcement text here..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        disabled={isPending}
                        rows={10}
                        data-testid="input-text"
                        className="w-full bg-card border border-border/60 rounded-md px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-y disabled:opacity-50 min-h-[220px]"
                      />
                    </motion.div>
                  )}

                  {/* URL MODE */}
                  {mode === "url" && (
                    <motion.div
                      key="url"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                    >
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://techcrunch.com/article/..."
                          value={urlInput}
                          onChange={(e) => { setUrlInput(e.target.value); setUrlFetched(false); setUrlError(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleFetchUrl(); }}}
                          disabled={isPending || isFetchingUrl}
                          className="flex-1 bg-card border border-border/60 rounded-md px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => void handleFetchUrl()}
                          disabled={!urlInput.trim() || isFetchingUrl || isPending}
                          className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 whitespace-nowrap"
                        >
                          {isFetchingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                          {isFetchingUrl ? "Fetching…" : "Fetch"}
                        </button>
                      </div>

                      {urlError && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          {urlError}
                        </div>
                      )}

                      {urlFetched && text && (
                        <div className="rounded-md border border-border/40 bg-card/40 p-3 space-y-1.5">
                          <p className="text-xs font-mono text-positive uppercase tracking-widest">Content extracted</p>
                          <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">{text}</p>
                          <p className="text-[10px] font-mono text-muted-foreground/50">{text.length} characters</p>
                        </div>
                      )}

                      {!urlFetched && !urlError && (
                        <p className="text-xs text-muted-foreground/60">
                          Works with news articles, blog posts, press releases, product pages, and most public web pages.
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* FILE MODE */}
                  {mode === "file" && (
                    <motion.div
                      key="file"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      {fileName && !fileError ? (
                        <div className="rounded-md border border-border/40 bg-card/40 p-4 flex items-start gap-3">
                          <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{fileName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{text.length} characters extracted</p>
                            <p className="text-xs text-muted-foreground/60 mt-1.5 line-clamp-2">{text.slice(0, 120)}…</p>
                          </div>
                          <button type="button" onClick={clearFile} className="text-muted-foreground/50 hover:text-foreground transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`relative border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-3 text-center transition-colors cursor-pointer ${
                            isDragging
                              ? "border-primary bg-primary/5"
                              : "border-border/50 hover:border-border hover:bg-card/30"
                          }`}
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleFileDrop}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".txt,.pdf,.md,.doc,.docx"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                          {isParsingFile ? (
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          ) : (
                            <UploadCloud className={`w-8 h-8 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground/50"}`} />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {isParsingFile ? "Extracting text…" : "Drop a file or click to browse"}
                            </p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                              PDF, TXT, MD — up to 10 MB
                            </p>
                          </div>
                          {fileError && (
                            <div className="flex items-center gap-1.5 text-xs text-destructive">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {fileError}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
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
