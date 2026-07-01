import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { PawPrint, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const searchSchema = z.object({
  mode: z.enum(["login", "register"]).catch("login"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Inloggen — PetKeeper" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/home" });
  }, [user, loading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/home`,
          },
        });
        if (error) throw error;
        toast.success("Welkom bij PetKeeper");
        navigate({ to: "/home" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/home" });
      }
    } catch (err: any) {
      toast.error(err?.message || "Er ging iets mis");
    } finally {
      setSubmitting(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <div className="min-h-screen bg-background px-6 pt-8 pb-12">
      <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground text-sm mb-8">
        <ArrowLeft className="w-4 h-4" /> Terug
      </Link>
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "var(--gradient-champagne)" }}>
            <PawPrint className="w-5 h-5 text-primary-foreground" strokeWidth={1.75} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">PetKeeper</div>
            <h1 className="text-3xl font-display font-medium">
              {isRegister ? "Account aanmaken" : "Welkom terug"}
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card rounded-3xl p-6 shadow-[var(--shadow-soft)]">
          {isRegister && (
            <div className="space-y-2">
              <Label>Volledige naam</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Sandra de Vries" className="h-12 rounded-xl" />
            </div>
          )}
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="jij@voorbeeld.nl" className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Wachtwoord</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" className="h-12 rounded-xl" />
          </div>
          <Button type="submit" disabled={submitting} size="lg" className="w-full h-13 rounded-full">
            {submitting ? "Even geduld…" : isRegister ? "Account aanmaken" : "Inloggen"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground space-y-3">
          {isRegister ? (
            <p>Heb je al een account?{" "}
              <Link to="/auth" search={{ mode: "login" }} className="text-foreground font-medium">Inloggen</Link>
            </p>
          ) : (
            <>
              <p>Nieuw bij PetKeeper?{" "}
                <Link to="/auth" search={{ mode: "register" }} className="text-foreground font-medium">Maak een account</Link>
              </p>
              <p><Link to="/forgot-password" className="text-foreground">Wachtwoord vergeten?</Link></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}