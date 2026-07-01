import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { User, Bell, Shield, FileText, Mail, Info, LogOut, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — PetKeeper" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  async function logout() {
    await supabase.auth.signOut();
    toast.success("Uitgelogd");
    navigate({ to: "/" });
  }
  return (
    <>
      <PageHeader subtitle="Account & voorkeuren" title="Instellingen" />
      <ProfileCard />
      <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] divide-y divide-border overflow-hidden mb-6">
        <NotificationsRow />
        <TextDialogRow icon={Shield} title="Privacybeleid" body={PRIVACY} />
        <TextDialogRow icon={FileText} title="Algemene voorwaarden" body={TERMS} />
        <TextDialogRow icon={Mail} title="Contact" body={CONTACT} />
        <TextDialogRow icon={Info} title="Over PetKeeper" body={ABOUT} />
      </div>
      <Button onClick={logout} variant="secondary" className="w-full h-12 rounded-full text-destructive">
        <LogOut className="w-4 h-4 mr-2" /> Uitloggen
      </Button>
    </>
  );
}

function ProfileCard() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("profiles").select("*").maybeSingle();
      return { ...(data ?? {}), email: u.user?.email } as any;
    },
  });
  const [name, setName] = useState("");
  useEffect(() => { setName(profile?.full_name ?? ""); }, [profile?.full_name]);
  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("profiles").upsert({ id: u.user!.id, full_name: name });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Profile updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] p-5 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--gradient-champagne)" }}>
          <User className="w-5 h-5 text-primary-foreground" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">{profile?.full_name || "Jouw profiel"}</div>
          <div className="text-xs text-muted-foreground truncate">{profile?.email}</div>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Volledige naam</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl h-11" />
        <Button onClick={() => save.mutate()} disabled={save.isPending} size="sm" className="w-full rounded-full h-10 mt-1">
          {save.isPending ? "Opslaan…" : "Opslaan"}
        </Button>
      </div>
    </div>
  );
}

function NotificationsRow() {
  const [on, setOn] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("pk_notifications") !== "false";
  });
  useEffect(() => { localStorage.setItem("pk_notifications", String(on)); }, [on]);
  return (
    <div className="px-5 py-4 flex items-center gap-3">
      <Bell className="w-5 h-5 text-primary" strokeWidth={1.75} />
      <div className="flex-1">
        <div className="text-sm font-medium">Meldingen</div>
        <div className="text-xs text-muted-foreground">Herinneringen</div>
      </div>
      <Switch checked={on} onCheckedChange={setOn} />
    </div>
  );
}

function TextDialogRow({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-secondary/40 transition">
          <Icon className="w-5 h-5 text-primary" strokeWidth={1.75} />
          <div className="flex-1 text-sm font-medium">{title}</div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">{title}</DialogTitle></DialogHeader>
        <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{body}</div>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}

const PRIVACY = `PetKeeper is committed to protecting your privacy. Your pet data is stored securely and is only accessible to you.

We do not sell, trade, or share your personal information with third parties. Photos, documents, and records you add remain private to your account.

You may delete your account and all associated data at any time by contacting support.`;

const TERMS = `By using PetKeeper you agree to use the service responsibly and for lawful purposes only.

PetKeeper is a personal record-keeping tool. It is not a substitute for professional veterinary care. Always consult a qualified veterinarian for medical decisions.

We reserve the right to update these terms; continued use of the app constitutes acceptance.`;

const CONTACT = `Need help or have feedback?

Email: support@petkeeper.app

We aim to respond within two business days.`;

const ABOUT = `PetKeeper is a beautifully crafted mobile companion for pet owners who care deeply.

Version 1.0

Designed with warmth, built with care.`;