import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Wachtwoord vergeten — PetKeeper" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Controleer je e-mail voor een herstel-link");
  }

  return (
    <div className="min-h-screen bg-background px-6 pt-8 pb-12">
      <Link to="/auth" search={{ mode: "login" }} className="inline-flex items-center gap-2 text-muted-foreground text-sm mb-8">
        <ArrowLeft className="w-4 h-4" /> Terug naar inloggen
      </Link>
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-display font-medium mb-2">Wachtwoord herstellen</h1>
        <p className="text-muted-foreground mb-8">Voer je e-mailadres in en we sturen je een beveiligde link om een nieuw wachtwoord in te stellen.</p>
        {sent ? (
          <div className="bg-card rounded-3xl p-8 text-center shadow-[var(--shadow-soft)]">
            <Mail className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-foreground">Als er een account bestaat voor dit e-mailadres, is er een herstel-link onderweg.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 bg-card rounded-3xl p-6 shadow-[var(--shadow-soft)]">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl" />
            </div>
            <Button type="submit" disabled={loading} size="lg" className="w-full h-13 rounded-full">
              {loading ? "Versturen…" : "Herstel-link sturen"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}