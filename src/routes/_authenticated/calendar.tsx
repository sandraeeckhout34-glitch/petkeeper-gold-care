import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar as CalendarIcon, Pill, Syringe, Bell } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Calendar } from "@/components/ui/calendar";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — PetKeeper" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const day = selected ? format(selected, "yyyy-MM-dd") : "";

  const { data: events } = useQuery({
    queryKey: ["calendar", day],
    enabled: !!day,
    queryFn: async () => {
      const [a, r, m, v] = await Promise.all([
        supabase.from("appointments").select("*, pets(name)").eq("date", day),
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
        <Calendar mode="single" selected={selected} onSelect={setSelected} className="w-full" />
      </div>
      <h2 className="font-display text-lg mb-3">{selected ? format(selected, "EEEE, MMM d") : ""}</h2>
      <Section icon={CalendarIcon} title="Appointments" items={events?.appointments ?? []} render={(a: any) => `${a.title} • ${a.pets?.name ?? ""} ${a.time ?? ""}`} />
      <Section icon={Pill} title="Medications" items={events?.medications ?? []} render={(m: any) => `${m.name} • ${m.pets?.name ?? ""} ${m.dosage ?? ""}`} />
      <Section icon={Syringe} title="Vaccinations due" items={events?.vaccinations ?? []} render={(v: any) => `${v.vaccine} • ${v.pets?.name ?? ""}`} />
      <Section icon={Bell} title="Reminders" items={events?.reminders ?? []} render={(r: any) => `${r.title} • ${r.time ?? ""}`} />
    </>
  );
}

function Section({ icon: Icon, title, items, render }: any) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        <Icon className="w-4 h-4" strokeWidth={1.75} />
        <span className="text-xs uppercase tracking-wider">{title}</span>
      </div>
      <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] divide-y divide-border overflow-hidden">
        {items.map((it: any) => (
          <div key={it.id} className="px-5 py-3 text-sm">{render(it)}</div>
        ))}
      </div>
    </div>
  );
}