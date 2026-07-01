import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PawPrint, CalendarDays, Pill, Wallet, Bell, Plus, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { PetFormDialog, SubRecordDialog } from "@/lib/pet-forms";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — PetKeeper" }] }),
  component: HomePage,
});

function HomePage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const in30 = format(new Date(Date.now() + 30 * 864e5), "yyyy-MM-dd");

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").maybeSingle();
      return data;
    },
  });

  const pets = useQuery({
    queryKey: ["pets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const appts = useQuery({
    queryKey: ["appointments", "today"],
    queryFn: async () => {
      const { data } = await supabase.from("appointments").select("*, pets(name)").eq("date", today).order("time");
      return data ?? [];
    },
  });

  const meds = useQuery({
    queryKey: ["medications", "active"],
    queryFn: async () => {
      const { data } = await supabase.from("medications").select("*, pets(name)").or(`end_date.is.null,end_date.gte.${today}`).limit(5);
      return data ?? [];
    },
  });

  const vacs = useQuery({
    queryKey: ["vaccinations", "upcoming"],
    queryFn: async () => {
      const { data } = await supabase.from("vaccinations").select("*, pets(name)").gte("next_due_date", today).lte("next_due_date", in30).order("next_due_date").limit(5);
      return data ?? [];
    },
  });

  const docs = useQuery({
    queryKey: ["documents", "recent"],
    queryFn: async () => {
      const { data } = await supabase.from("documents").select("*, pets(name)").order("created_at", { ascending: false }).limit(3);
      return data ?? [];
    },
  });

  const firstName = (profile.data?.full_name || "").split(" ")[0];

  return (
    <>
      <PageHeader
        subtitle={format(new Date(), "EEEE, MMM d")}
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
      />

      {/* Quick actions */}
      <section className="mb-8">
        <div className="grid grid-cols-5 gap-2">
          <PetFormDialog trigger={<QAction icon={PawPrint} label="Pet" />} />
          <QuickAdd icon={CalendarDays} label="Visit" table="appointments" pets={pets.data ?? []} />
          <QuickAdd icon={Pill} label="Med" table="medications" pets={pets.data ?? []} />
          <QuickAdd icon={Bell} label="Remind" table="reminders" pets={pets.data ?? []} />
          <Link to="/expenses" className="flex flex-col items-center gap-1 rounded-2xl bg-card border border-border py-3 shadow-[var(--shadow-soft)]">
            <Wallet className="w-5 h-5 text-primary" strokeWidth={1.75} />
            <span className="text-[10px] font-medium">Costs</span>
          </Link>
        </div>
      </section>

      {/* My Pets */}
      <SectionHeader title="My Pets" to="/pets" />
      {pets.data && pets.data.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-2 mb-8 scroll-smooth">
          {pets.data.map((p) => (
            <Link key={p.id} to="/pets/$id" params={{ id: p.id }} className="shrink-0 w-32 bg-card rounded-3xl p-4 border border-border shadow-[var(--shadow-soft)]">
              <PetAvatar url={p.photo_url} name={p.name} />
              <div className="mt-3 font-medium text-sm truncate">{p.name}</div>
              <div className="text-xs text-muted-foreground truncate">{p.breed || p.species}</div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyCard message="Add your first pet to begin" cta={<PetFormDialog trigger={<Button size="sm" className="rounded-full">Add pet</Button>} />} />
      )}

      <SectionHeader title="Today's Appointments" />
      <ListCard items={appts.data ?? []} render={(a) => (
        <Row primary={a.title} secondary={`${a.pets?.name ?? ""} • ${a.time ?? ""}`} />
      )} empty="No appointments today" />

      <SectionHeader title="Today's Medication" />
      <ListCard items={meds.data ?? []} render={(m) => (
        <Row primary={m.name} secondary={`${m.pets?.name ?? ""} • ${m.dosage ?? ""} ${m.frequency ?? ""}`} />
      )} empty="No medication scheduled" />

      <SectionHeader title="Upcoming Vaccinations" />
      <ListCard items={vacs.data ?? []} render={(v) => (
        <Row primary={v.vaccine} secondary={`${v.pets?.name ?? ""} • Due ${v.next_due_date}`} />
      )} empty="Nothing due in 30 days" />

      <SectionHeader title="Recent Documents" />
      <ListCard items={docs.data ?? []} render={(d) => (
        <Row primary={d.title} secondary={`${d.pets?.name ?? ""} • ${d.date ?? ""}`} />
      )} empty="No documents yet" />
    </>
  );
}

function QAction({ icon: Icon, label }: any) {
  return (
    <button className="flex flex-col items-center gap-1 rounded-2xl bg-card border border-border py-3 shadow-[var(--shadow-soft)] w-full">
      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--gradient-champagne)" }}>
        <Plus className="w-4 h-4 text-primary-foreground" />
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function QuickAdd({ icon: Icon, label, table, pets }: any) {
  const petOpts = pets.map((p: any) => p.name);
  if (pets.length === 0) {
    return (
      <button disabled className="flex flex-col items-center gap-1 rounded-2xl bg-card border border-border py-3 opacity-50 w-full">
        <Icon className="w-5 h-5 text-primary" strokeWidth={1.75} />
        <span className="text-[10px] font-medium">{label}</span>
      </button>
    );
  }
  const fieldsByTable: any = {
    appointments: [
      { key: "title", label: "Title", type: "text" },
      { key: "date", label: "Date", type: "date" },
      { key: "time", label: "Time", type: "time" },
      { key: "location", label: "Location", type: "text" },
      { key: "type", label: "Type", type: "select", options: ["Vet", "Grooming", "Training", "Other"] },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    medications: [
      { key: "name", label: "Medication name", type: "text" },
      { key: "dosage", label: "Dosage", type: "text" },
      { key: "frequency", label: "Frequency", type: "text" },
      { key: "start_date", label: "Start date", type: "date" },
      { key: "end_date", label: "End date", type: "date" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    reminders: [
      { key: "title", label: "Title", type: "text" },
      { key: "category", label: "Category", type: "select", options: ["Feeding", "Walk", "Grooming", "Medication", "Vet", "Other"] },
      { key: "date", label: "Date", type: "date" },
      { key: "time", label: "Time", type: "time" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  };
  const petId = pets[0]?.id;
  return (
    <SubRecordDialog
      table={table}
      petId={petId}
      title={`New ${label.toLowerCase()}`}
      fields={fieldsByTable[table]}
      trigger={
        <button className="flex flex-col items-center gap-1 rounded-2xl bg-card border border-border py-3 shadow-[var(--shadow-soft)] w-full">
          <Icon className="w-5 h-5 text-primary" strokeWidth={1.75} />
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      }
    />
  );
}

function SectionHeader({ title, to }: { title: string; to?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display text-xl">{title}</h2>
      {to && (
        <Link to={to} className="text-xs text-muted-foreground inline-flex items-center gap-1">
          See all <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function ListCard({ items, render, empty }: { items: any[]; render: (it: any) => React.ReactNode; empty: string }) {
  if (!items || items.length === 0) return <EmptyCard message={empty} />;
  return (
    <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] divide-y divide-border mb-8 overflow-hidden">
      {items.map((it: any) => <div key={it.id} className="px-5 py-4">{render(it)}</div>)}
    </div>
  );
}

function Row({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <div>
      <div className="text-sm font-medium">{primary}</div>
      {secondary && <div className="text-xs text-muted-foreground mt-0.5">{secondary}</div>}
    </div>
  );
}

function EmptyCard({ message, cta }: { message: string; cta?: React.ReactNode }) {
  return (
    <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] px-6 py-8 text-center mb-8">
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {cta}
    </div>
  );
}

function PetAvatar({ url, name }: { url: string | null; name: string }) {
  if (url) return <img src={url} alt={name} className="w-full aspect-square object-cover rounded-2xl" />;
  return (
    <div className="w-full aspect-square rounded-2xl flex items-center justify-center" style={{ background: "var(--gradient-surface)" }}>
      <PawPrint className="w-8 h-8 text-primary" strokeWidth={1.5} />
    </div>
  );
}