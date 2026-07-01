import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar as CalendarIcon, Pill, Syringe, Bell, Plus } from "lucide-react";
import { format } from "date-fns";
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
  head: () => ({ meta: [{ title: "Calendar — PetKeeper" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const day = selected ? format(selected, "yyyy-MM-dd") : "";

  const pets = useQuery({
    queryKey: ["pets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pets").select("id, name").eq("status","active").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: events } = useQuery({
    queryKey: ["calendar", day],
    enabled: !!day,
    queryFn: async () => {
      const [a, r, m, v] = await Promise.all([
        supabase.from("appointments").select("*, pets(name)").eq("date", day).order("time"),
        supabase.from("reminders").select("*, pets(name)").eq("date", day),
        supabase.from("medications").select("*, pets(name)").lte("start_date", day).or(`end_date.is.null,end_date.gte.${day}`),
        supabase.from("vaccinations").select("*, pets(name)").eq("next_due_date", day),
      ]);
      return {
        appointments: a.data ?? [],
        reminders: r.data ?? [],
        medications: m.data ?? [],
        vaccinations: v.data ?? [],
      };
    },
  });

  return (
    <>
      <PageHeader subtitle="Your schedule" title="Calendar" />
      <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] p-3 mb-6">
        <Calendar mode="single" selected={selected} onSelect={(d) => d && setSelected(d)} className="w-full pointer-events-auto" />
      </div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="font-display text-lg truncate">{selected ? format(selected, "EEEE, MMM d") : ""}</h2>
        <AddAppointmentDialog
          defaultDate={day}
          pets={pets.data ?? []}
          trigger={
            <Button size="sm" className="rounded-full h-9 px-4 gap-1.5 shrink-0">
              <Plus className="w-4 h-4" /> Add Appointment
            </Button>
          }
        />
      </div>
      <Section icon={CalendarIcon} title="Appointments" items={events?.appointments ?? []} empty="No appointments" render={(a: any) => `${a.title} • ${a.pets?.name ?? ""} ${a.time ?? ""}`} />
      <Section icon={Pill} title="Medications" items={events?.medications ?? []} empty="No medications" render={(m: any) => `${m.name} • ${m.pets?.name ?? ""} ${m.dosage ?? ""}`} />
      <Section icon={Syringe} title="Vaccinations due" items={events?.vaccinations ?? []} empty="No vaccinations due" render={(v: any) => `${v.vaccine} • ${v.pets?.name ?? ""}`} />
      <Section icon={Bell} title="Reminders" items={events?.reminders ?? []} empty="No reminders" render={(r: any) => `${r.title} • ${r.time ?? ""}`} />
    </>
  );
}

function Section({ icon: Icon, title, items, render, empty }: any) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        <Icon className="w-4 h-4" strokeWidth={1.75} />
        <span className="text-xs uppercase tracking-wider">{title}</span>
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
  trigger, defaultDate, pets,
}: {
  trigger: React.ReactNode;
  defaultDate: string;
  pets: { id: string; name: string }[];
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
      qc.invalidateQueries();
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
          <DialogTitle className="font-display text-2xl">New appointment</DialogTitle>
        </DialogHeader>
        {noPets ? (
          <p className="text-sm text-muted-foreground py-4">Add a pet first before creating an appointment.</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <F label="Pet">
              <Select value={form.pet_id || undefined} onValueChange={(v) => setForm({ ...form, pet_id: v })}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Choose a pet" /></SelectTrigger>
                <SelectContent>
                  {pets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Appointment Type">
              <Select value={form.type || undefined} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Choose type" /></SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
            {form.type === "Other" && (
              <F label="Custom Appointment Title">
                <Input
                  required
                  value={form.custom_title}
                  onChange={(e) => setForm({ ...form, custom_title: e.target.value })}
                  className="rounded-xl h-11"
                  placeholder="Enter a title"
                />
              </F>
            )}
            <div className="grid grid-cols-2 gap-3">
              <F label="Date"><Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-xl h-11" /></F>
              <F label="Time"><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="rounded-xl h-11" /></F>
            </div>
            <F label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded-xl h-11" /></F>
            <F label="Veterinarian / Groomer">
              <Input
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                className="rounded-xl h-11"
                placeholder="Name of vet or groomer"
              />
            </F>
            <F label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl" /></F>
            <DialogFooter>
              <Button type="submit" disabled={mut.isPending} className="w-full h-12 rounded-full">
                {mut.isPending ? "Saving…" : "Save appointment"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

const APPOINTMENT_TYPES = [
  { value: "Veterinary Check-up", label: "🩺 Veterinary Check-up" },
  { value: "Vaccination", label: "💉 Vaccination" },
  { value: "Grooming", label: "✂️ Grooming" },
  { value: "Dental Care", label: "🪥 Dental Care" },
  { value: "Blood Test", label: "🧪 Blood Test" },
  { value: "Medication Follow-up", label: "💊 Medication Follow-up" },
  { value: "Deworming", label: "🐛 Deworming" },
  { value: "Flea & Tick Treatment", label: "🦟 Flea & Tick Treatment" },
  { value: "Weight Check", label: "⚖️ Weight Check" },
  { value: "Surgery", label: "🏥 Surgery" },
  { value: "Emergency", label: "🚑 Emergency" },
  { value: "Other", label: "📋 Other" },
];

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}