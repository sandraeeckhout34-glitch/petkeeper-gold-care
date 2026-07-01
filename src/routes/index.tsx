import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PawPrint, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PetKeeper — Luxury Pet Management" },
      { name: "description", content: "The elegant way to care for your pets." },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/home" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-between px-8 py-16">
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-8 max-w-md">
        <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-[var(--shadow-elevated)]"
             style={{ background: "var(--gradient-champagne)" }}>
          <PawPrint className="w-11 h-11 text-primary-foreground" strokeWidth={1.5} />
        </div>
        <div className="space-y-3">
          <h1 className="text-5xl font-display font-medium text-foreground">PetKeeper</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            De verfijnde metgezel voor zorgzame huisdiereigenaren. Organiseer het leven van je huisdier met stijl.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-[0.2em]">
          <Sparkles className="w-3 h-3" /> Elegant ontworpen
        </div>
      </div>
      <div className="w-full max-w-md space-y-3">
        <Button asChild size="lg" className="w-full h-14 rounded-full text-base font-medium shadow-[var(--shadow-soft)]">
          <Link to="/auth" search={{ mode: "register" }}>Beginnen</Link>
        </Button>
        <Button asChild variant="ghost" size="lg" className="w-full h-12 rounded-full text-foreground">
          <Link to="/auth" search={{ mode: "login" }}>Ik heb al een account</Link>
        </Button>
      </div>
    </div>
  );
}
