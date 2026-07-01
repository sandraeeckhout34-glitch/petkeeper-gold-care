import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — PetKeeper" }] }),
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
    toast.success("Check your email for a reset link");
  }

  return (
    <div className="min-h-screen bg-background px-6 pt-8 pb-12">
      <Link to="/auth" search={{ mode: "login" }} className="inline-flex items-center gap-2 text-muted-foreground text-sm mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to sign in
      </Link>
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-display font-medium mb-2">Reset password</h1>
        <p className="text-muted-foreground mb-8">Enter your email and we'll send you a secure link to set a new password.</p>
        {sent ? (
          <div className="bg-card rounded-3xl p-8 text-center shadow-[var(--shadow-soft)]">
            <Mail className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-foreground">If an account exists for that email, a reset link is on its way.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 bg-card rounded-3xl p-6 shadow-[var(--shadow-soft)]">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl" />
            </div>
            <Button type="submit" disabled={loading} size="lg" className="w-full h-13 rounded-full">
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}