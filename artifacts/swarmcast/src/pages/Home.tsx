import { useLocation } from "wouter";
import { InputForm } from "@/components/InputForm";

export default function Home() {
  const [, navigate] = useLocation();

  const handleCreateComplete = (id: string) => {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(`new:${id}`, "1");
    }
    navigate(`/analysis/${id}`);
  };

  const handleSelectHistory = (id: string) => {
    navigate(`/analysis/${id}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="px-6 h-14 flex items-center max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold tracking-tight">SC</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-sm tracking-tight">SwarmCast</span>
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest hidden sm:inline">
                Mission Control
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <InputForm onCreateComplete={handleCreateComplete} onSelectHistory={handleSelectHistory} />
      </main>
    </div>
  );
}
