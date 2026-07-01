import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { User, Bell, Shield, FileText, Mail, Info, LogOut, ChevronRight, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Instellingen — PetKeeper" }] }),
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
        <Link to="/archived-pets" className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-secondary/40 transition">
          <Archive className="w-5 h-5 text-primary" strokeWidth={1.75} />
          <div className="flex-1 text-sm font-medium">Gearchiveerde huisdieren</div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Profiel bijgewerkt"); },
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

const PRIVACY = `PetKeeper hecht veel waarde aan jouw privacy. Jouw huisdiergegevens worden veilig opgeslagen en zijn alleen toegankelijk voor jou.

Wij verkopen, verhandelen of delen jouw persoonlijke informatie niet met derden. Foto's, documenten en records die je toevoegt blijven privé binnen jouw account.

Je kunt jouw account en alle bijbehorende gegevens op elk moment verwijderen door contact op te nemen met support.`;

const TERMS = `Door PetKeeper te gebruiken ga je akkoord om de dienst verantwoord en uitsluitend voor rechtmatige doeleinden te gebruiken.

PetKeeper is een persoonlijk administratie-hulpmiddel. Het is geen vervanging voor professionele diergeneeskundige zorg. Raadpleeg altijd een gekwalificeerde dierenarts voor medische beslissingen.

Wij behouden ons het recht voor deze voorwaarden bij te werken; voortgezet gebruik van de app betekent aanvaarding daarvan.`;

const CONTACT = `Hulp nodig of feedback?

E-mail: support@petkeeper.app

We streven ernaar binnen twee werkdagen te reageren.`;

const ABOUT = `PetKeeper is een zorgvuldig ontworpen metgezel voor huisdiereigenaren die er echt om geven.

Versie 1.0

Ontworpen met warmte, gebouwd met zorg.`;