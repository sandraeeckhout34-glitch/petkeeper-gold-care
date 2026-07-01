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
  head: () => ({ meta: [{ title: "Sign in — PetKeeper" }] }),
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
        toast.success("Welcome to PetKeeper");
        navigate({ to: "/home" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/home" });
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <div className="min-h-screen bg-background px-6 pt-8 pb-12">
      <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground text-sm mb-8">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "var(--gradient-champagne)" }}>
            <PawPrint className="w-5 h-5 text-primary-foreground" strokeWidth={1.75} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">PetKeeper</div>
            <h1 className="text-3xl font-display font-medium">
              {isRegister ? "Create account" : "Welcome back"}
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card rounded-3xl p-6 shadow-[var(--shadow-soft)]">
          {isRegister && (
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Doe" className="h-12 rounded-xl" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" className="h-12 rounded-xl" />
          </div>
          <Button type="submit" disabled={submitting} size="lg" className="w-full h-13 rounded-full">
            {submitting ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground space-y-3">
          {isRegister ? (
            <p>Already have an account?{" "}
              <Link to="/auth" search={{ mode: "login" }} className="text-foreground font-medium">Sign in</Link>
            </p>
          ) : (
            <>
              <p>New to PetKeeper?{" "}
                <Link to="/auth" search={{ mode: "register" }} className="text-foreground font-medium">Create an account</Link>
              </p>
              <p><Link to="/forgot-password" className="text-foreground">Forgot password?</Link></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}