import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar as CalendarIcon, Pill, Syringe, Bell, Plus } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Kalender — PetKeeper" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const day = selected ? format(selected, "yyyy-MM-dd") : "";
  const today = format(new Date(), "yyyy-MM-dd");

  const pets = useQuery({
    queryKey: ["pets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pets").select("id, name").eq("status","active").is("deleted_at", null).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: events } = useQuery({
    queryKey: ["calendar", day],
    enabled: !!day,
    queryFn: async () => {
      const [a, r, m, v] = await Promise.all([
        supabase.from("appointments").select("*, pets(name,status,deleted_at)").eq("date", day).order("time", { ascending: true, nullsFirst: false }),
        supabase.from("reminders").select("*, pets(name,status,deleted_at)").eq("date", day).order("time", { ascending: true, nullsFirst: false }),
        supabase.from("medications").select("*, pets(name,status,deleted_at)").lte("start_date", day).or(`end_date.is.null,end_date.gte.${day}`),
        supabase.from("vaccinations").select("*, pets(name,status,deleted_at)").eq("next_due_date", day),
      ]);
      const visible = (rows: any[] | null) => (rows ?? []).filter(isVisiblePetRecord);
      return {
        appointments: sortByTime(visible(a.data)),
        reminders: visible(r.data),
        medications: visible(m.data),
        vaccinations: visible(v.data),
      };
    },
  });

  const upcoming = useQuery({
    queryKey: ["appointments", "upcoming", today],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("*, pets(name,status,deleted_at)")
        .gte("date", today)
        .order("date", { ascending: true })
        .order("time", { ascending: true, nullsFirst: false });
      return (data ?? []).filter(isVisiblePetRecord);
    },
  });

  return (
    <>
      <PageHeader subtitle="Jouw agenda" title="Kalender" />
      <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] p-3 mb-6">
        <Calendar mode="single" selected={selected} onSelect={(d) => d && setSelected(d)} className="w-full pointer-events-auto" />
      </div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="font-display text-lg truncate">{selected ? format(selected, "EEEE d MMM") : ""}</h2>
        <AddAppointmentDialog
          defaultDate={day}
          pets={pets.data ?? []}
          onSaved={(savedDate) => setSelected(parseDateOnly(savedDate))}
          trigger={
            <Button size="sm" className="rounded-full h-9 px-4 gap-1.5 shrink-0">
              <Plus className="w-4 h-4" /> Afspraak toevoegen
            </Button>
          }
        />
      </div>
      <Section
        icon={CalendarIcon}
        title="Afspraken"
        countLabel={`${events?.appointments?.length ?? 0} afspraken op deze datum`}
        items={events?.appointments ?? []}
        empty="Geen afspraken"
        render={(a: any) => `${formatAppointmentTime(a.time)} - ${a.title}`}
      />
      <Section icon={Pill} title="Medicatie" items={events?.medications ?? []} empty="Geen medicatie" render={(m: any) => `${m.name} • ${m.pets?.name ?? ""} ${m.dosage ?? ""}`} />
      <Section icon={Syringe} title="Vaccinaties" items={events?.vaccinations ?? []} empty="Geen vaccinaties" render={(v: any) => `${v.vaccine} • ${v.pets?.name ?? ""}`} />
      <Section icon={Bell} title="Herinneringen" items={events?.reminders ?? []} empty="Geen herinneringen" render={(r: any) => `${r.title} • ${(r.time ?? "").slice(0,5)}`} />
      <UpcomingAppointments items={upcoming.data ?? []} />
    </>
  );
}

function UpcomingAppointments({ items }: { items: any[] }) {
  const groups = groupByDate(items);
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        <CalendarIcon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
        <span className="text-xs uppercase tracking-wider truncate">Alle komende afspraken</span>
      </div>
      {groups.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] px-5 py-4 text-sm text-muted-foreground text-center">
          Geen komende afspraken
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(([date, rows]) => (
            <div key={date} className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] overflow-hidden">
              <div className="px-5 py-2 bg-muted/40 text-xs font-medium capitalize">
                {format(parseDateOnly(date), "EEEE d MMMM", { locale: nl })}
              </div>
              <div className="divide-y divide-border">
                {rows.map((a: any) => (
                  <div key={a.id} className="px-5 py-3 text-sm">
                    <div className="font-medium">{formatAppointmentTime(a.time)} — {a.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {a.pets?.name ?? ""}{a.location ? ` • ${a.location}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByDate(items: any[]): [string, any[]][] {
  const map = new Map<string, any[]>();
  for (const it of items) {
    const key = it.date;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }
  return Array.from(map.entries());
}

function isVisiblePetRecord(row: any) {
  return !row.pet_id || (!!row.pets && row.pets.status !== "deleted" && !row.pets.deleted_at);
}

function sortByTime(items: any[]) {
  return [...items].sort((left, right) => {
    const leftTime = left.time ?? "99:99:99";
    const rightTime = right.time ?? "99:99:99";
    const byTime = leftTime.localeCompare(rightTime);
    if (byTime !== 0) return byTime;
    return String(left.created_at ?? "").localeCompare(String(right.created_at ?? ""));
  });
}

function formatAppointmentTime(time: string | null | undefined) {
  return time ? time.slice(0, 5) : "Geen tijd";
}

function parseDateOnly(value: string) {
  const [year, month, date] = value.split("-").map(Number);
  return new Date(year, month - 1, date);
}

function Section({ icon: Icon, title, countLabel, items, render, empty }: any) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between gap-3 mb-2 text-muted-foreground">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span className="text-xs uppercase tracking-wider truncate">{title}</span>
        </div>
        {countLabel ? <span className="text-xs font-medium text-foreground shrink-0">{countLabel}</span> : null}
      </div>
      <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] divide-y divide-border overflow-hidden">
        {items && items.length > 0 ? (
          items.map((it: any) => (
            <div key={it.id} className="px-5 py-3 text-sm">{render(it)}</div>
          ))
        ) : (
          <div className="px-5 py-4 text-sm text-muted-foreground text-center">{empty}</div>
        )}
      </div>
    </div>
  );
}

function AddAppointmentDialog({
  trigger, defaultDate, pets, onSaved,
}: {
  trigger: React.ReactNode;
  defaultDate: string;
  pets: { id: string; name: string }[];
  onSaved?: (savedDate: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    pet_id: "",
    type: "",
    custom_title: "",
    date: defaultDate,
    time: "",
    location: "",
    provider: "",
    notes: "",
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!form.pet_id) throw new Error("Kies een huisdier");
      if (!form.type) throw new Error("Kies een type afspraak");
      if (form.type === "Other" && !form.custom_title.trim())
        throw new Error("Voer een eigen titel in");
      if (!form.date) throw new Error("Kies een datum");
      const title = form.type === "Other" ? form.custom_title.trim() : form.type;
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("appointments").insert({
        user_id: u.user!.id,
        pet_id: form.pet_id,
        title,
        date: form.date,
        time: form.time || null,
        location: form.location || null,
        type: form.type || null,
        notes: form.notes || null,
        provider: form.provider || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      onSaved?.(form.date);
      toast.success("Afspraak toegevoegd");
      setOpen(false);
      setForm({ pet_id: "", type: "", custom_title: "", date: defaultDate, time: "", location: "", provider: "", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const noPets = pets.length === 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setForm((f) => ({ ...f, date: defaultDate })); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Nieuwe afspraak</DialogTitle>
        </DialogHeader>
        {noPets ? (
          <p className="text-sm text-muted-foreground py-4">Voeg eerst een huisdier toe voordat je een afspraak maakt.</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <F label="Huisdier">
              <Select value={form.pet_id || undefined} onValueChange={(v) => setForm({ ...form, pet_id: v })}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Kies een huisdier" /></SelectTrigger>
                <SelectContent>
                  {pets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Type afspraak">
              <Select value={form.type || undefined} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Kies een type" /></SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
            {form.type === "Other" && (
              <F label="Eigen titel afspraak">
                <Input
                  required
                  value={form.custom_title}
                  onChange={(e) => setForm({ ...form, custom_title: e.target.value })}
                  className="rounded-xl h-11"
                  placeholder="Voer een titel in"
                />
              </F>
            )}
            <div className="grid grid-cols-2 gap-3">
              <F label="Datum"><Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-xl h-11" /></F>
              <F label="Tijd"><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="rounded-xl h-11" /></F>
            </div>
            <F label="Locatie"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded-xl h-11" /></F>
            <F label="Dierenarts / Trimmer">
              <Input
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                className="rounded-xl h-11"
                placeholder="Naam van dierenarts of trimmer"
              />
            </F>
            <F label="Notities"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl" /></F>
            <DialogFooter>
              <Button type="submit" disabled={mut.isPending} className="w-full h-12 rounded-full">
                {mut.isPending ? "Opslaan…" : "Afspraak opslaan"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

const APPOINTMENT_TYPES = [
  { value: "Veterinary Check-up", label: "🩺 Dierenartscontrole" },
  { value: "Vaccination", label: "💉 Vaccinatie" },
  { value: "Grooming", label: "✂️ Trimmen" },
  { value: "Dental Care", label: "🪥 Gebitsverzorging" },
  { value: "Blood Test", label: "🧪 Bloedonderzoek" },
  { value: "Medication Follow-up", label: "💊 Medicatiecontrole" },
  { value: "Deworming", label: "🐛 Ontwormen" },
  { value: "Flea & Tick Treatment", label: "🦟 Vlooien & Teken" },
  { value: "Weight Check", label: "⚖️ Gewichtscontrole" },
  { value: "Surgery", label: "🏥 Operatie" },
  { value: "Emergency", label: "🚑 Spoed" },
  { value: "Other", label: "📋 Anders" },
];

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}