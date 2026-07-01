import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nieuw wachtwoord — PetKeeper" }] }),
  component: ResetPage,
});

function ResetPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Wachtwoord bijgewerkt");
    navigate({ to: "/home" });
  }

  return (
    <div className="min-h-screen bg-background px-6 pt-16 pb-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-display font-medium mb-8">Nieuw wachtwoord instellen</h1>
        <form onSubmit={submit} className="space-y-4 bg-card rounded-3xl p-6 shadow-[var(--shadow-soft)]">
          <div className="space-y-2">
            <Label>Nieuw wachtwoord</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-12 rounded-xl" />
          </div>
          <Button type="submit" disabled={loading} size="lg" className="w-full h-13 rounded-full">
            {loading ? "Bijwerken…" : "Wachtwoord bijwerken"}
          </Button>
        </form>
      </div>
    </div>
  );
}