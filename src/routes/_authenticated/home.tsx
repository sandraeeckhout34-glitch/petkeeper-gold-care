import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { PawPrint, CalendarDays, Pill, Syringe, FileText, Wallet, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  PetFormDialog, SubRecordDialog, type SubFieldDef,
  medicationFields, vaccinationFields, documentFields, expenseFields, formatTime,
} from "@/lib/pet-forms";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — PetKeeper" }] }),
  component: HomePage,
});

const appointmentFields: SubFieldDef[] = [
  {
    key: "title", label: "Type afspraak", type: "select-other",
    options: [
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
    ],
    otherKey: "custom_title", otherLabel: "Eigen titel afspraak",
    otherPlaceholder: "Voer titel in",
  },
  { key: "date", label: "Datum", type: "date" },
  { key: "time", label: "Tijd", type: "time" },
  { key: "location", label: "Locatie", type: "text" },
  { key: "provider", label: "Dierenarts / Trimmer", type: "text" },
  { key: "notes", label: "Notities", type: "textarea" },
];

function HomePage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const in30 = format(new Date(Date.now() + 30 * 864e5), "yyyy-MM-dd");
  const monthKey = format(new Date(), "yyyy-MM");
  const monthStart = `${monthKey}-01`;
  const nextMonthStart = format(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
    "yyyy-MM-dd",
  );

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
      const { data, error } = await supabase.from("pets").select("*").eq("status","active").is("deleted_at", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const appts = useQuery({
    queryKey: ["appointments", "today"],
    queryFn: async () => {
      const { data } = await supabase.from("appointments").select("*, pets(name,status)").eq("date", today).order("time");
      return (data ?? []).filter((row: any) => !row.pet_id || row.pets?.status !== "deleted");
    },
  });

  const meds = useQuery({
    queryKey: ["medications", "active"],
    queryFn: async () => {
      const { data } = await supabase.from("medications").select("*, pets(name,status)").or(`end_date.is.null,end_date.gte.${today}`).limit(5);
      return (data ?? []).filter((row: any) => !row.pet_id || row.pets?.status !== "deleted");
    },
  });

  const vacs = useQuery({
    queryKey: ["vaccinations", "upcoming"],
    queryFn: async () => {
      const { data } = await supabase.from("vaccinations").select("*, pets(name,status)").gte("next_due_date", today).lte("next_due_date", in30).order("next_due_date").limit(5);
      return (data ?? []).filter((row: any) => !row.pet_id || row.pets?.status !== "deleted");
    },
  });

  const expenses = useQuery({
    queryKey: ["expenses", "month", monthKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("amount,currency,date,pet_id,pets(status)")
        .gte("date", monthStart)
        .lt("date", nextMonthStart);
      return (data ?? []).filter((row: any) => !row.pet_id || row.pets?.status !== "deleted");
    },
  });

  const nameParts = (profile.data?.full_name || "").trim().split(/\s+/).filter(Boolean);
  // Full name may be stored "Lastname Firstname" (common in NL); prefer the last token as the given name.
  const firstName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0] ?? "";
  const monthTotal = (expenses.data ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const currency = (expenses.data?.[0] as any)?.currency ?? "EUR";
  const fmt = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(n);

  const petList = pets.data ?? [];

  return (
    <>
      <PageHeader
        subtitle={format(new Date(), "EEEE d MMMM", { locale: nl })}
        title={firstName ? `Welkom terug, ${firstName}` : "Welkom terug"}
      />

      {/* Quick actions */}
      <section className="mb-8">
        <div className="grid grid-cols-3 gap-2">
          <PetFormDialog trigger={<QAction icon={PawPrint} label="Huisdier" />} />
          <QuickAdd pets={petList} icon={CalendarDays} label="Afspraak" table="appointments" fields={appointmentFields} />
          <QuickAdd pets={petList} icon={Pill} label="Medicatie" table="medications" fields={medicationFields} />
          <QuickAdd pets={petList} icon={Syringe} label="Vaccinatie" table="vaccinations" fields={vaccinationFields} />
          <QuickAdd pets={petList} icon={FileText} label="Document" table="documents" fields={documentFields} />
          <QuickAdd pets={petList} icon={Wallet} label="Kosten" table="expenses" fields={expenseFields} />
        </div>
      </section>

      {/* My Pets */}
      <SectionHeader title="Mijn Huisdieren" to="/pets" />
      {petList.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-2 mb-8 scroll-smooth">
          {petList.map((p) => (
            <Link key={p.id} to="/pets/$id" params={{ id: p.id }} className="shrink-0 w-32 bg-card rounded-3xl p-4 border border-border shadow-[var(--shadow-soft)]">
              <PetAvatar url={p.photo_url} name={p.name} />
              <div className="mt-3 font-medium text-sm truncate">{p.name}</div>
              <div className="text-xs text-muted-foreground truncate">{p.breed || p.species}</div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyCard message="Voeg je eerste huisdier toe om te beginnen" cta={<PetFormDialog trigger={<Button size="sm" className="rounded-full">Huisdier toevoegen</Button>} />} />
      )}

      <SectionHeader title="Afspraken Vandaag" to="/calendar" />
      <ListCard items={appts.data ?? []} render={(a) => (
        <Row primary={a.title} secondary={`${a.pets?.name ?? ""} • ${formatTime(a.time)}`} />
      )} empty="Geen afspraken vandaag" />

      <SectionHeader title="Medicatie Vandaag" />
      <ListCard items={meds.data ?? []} render={(m) => (
        <Row primary={m.name} secondary={`${m.pets?.name ?? ""} • ${m.dosage ?? ""} ${m.frequency ?? ""}`} />
      )} empty="Geen medicatie gepland" />

      <SectionHeader title="Vaccinaties Binnenkort" />
      <ListCard items={vacs.data ?? []} render={(v) => (
        <Row primary={v.vaccine} secondary={`${v.pets?.name ?? ""} • Op ${v.next_due_date ?? ""}`} />
      )} empty="Niets binnen 30 dagen" />

      <SectionHeader title="Kosten Deze Maand" to="/expenses" />
      <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] px-5 py-5 mb-8 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{format(new Date(), "MMMM yyyy", { locale: nl })}</div>
          <div className="font-display text-2xl">{fmt(monthTotal)}</div>
        </div>
        <Wallet className="w-6 h-6 text-primary" strokeWidth={1.5} />
      </div>
    </>
  );
}

const QAction = React.forwardRef<HTMLButtonElement, any>(function QAction({ icon: Icon, label, ...props }, ref) {
  return (
    <button ref={ref} {...props} className="flex flex-col items-center gap-1 rounded-2xl bg-card border border-border py-3 shadow-[var(--shadow-soft)] w-full">
      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--gradient-champagne)" }}>
        <Icon className="w-4 h-4 text-primary-foreground" strokeWidth={1.75} />
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
});

function QuickAdd({ icon, label, table, fields, pets }: any) {
  return (
    <SubRecordDialog
      table={table}
      pets={pets}
      title={label}
      fields={fields}
      trigger={<QAction icon={icon} label={label} />}
    />
  );
}

function SectionHeader({ title, to }: { title: string; to?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display text-xl">{title}</h2>
      {to && (
        <Link to={to} className="text-xs text-muted-foreground inline-flex items-center gap-1">
          Bekijk alles <ArrowRight className="w-3 h-3" />
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
