import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SubRecordDialog } from "@/lib/pet-forms";

export const Route = createFileRoute("/_authenticated/reminders")({
  head: () => ({ meta: [{ title: "Reminders — PetKeeper" }] }),
  component: RemindersPage,
});

const fields = [
  { key: "title", label: "Title", type: "text" as const },
  { key: "category", label: "Category", type: "select" as const, options: ["Feeding", "Walk", "Grooming", "Medication", "Vet", "Other"] },
  { key: "date", label: "Date", type: "date" as const },
  { key: "time", label: "Time", type: "time" as const },
  { key: "notes", label: "Notes", type: "textarea" as const },
];

function RemindersPage() {
  const qc = useQueryClient();
  const { data: pets } = useQuery({
    queryKey: ["pets"],
    queryFn: async () => (await supabase.from("pets").select("id,name").eq("status","active")).data ?? [],
  });
  const { data } = useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reminders").select("*, pets(name)").order("date", { ascending: true }).order("time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("reminders").update({ completed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("reminders").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reminders"] }); toast.success("Removed"); },
  });

  return (
    <>
      <PageHeader
        subtitle="Never miss a beat"
        title="Reminders"
        action={
          <SubRecordDialog table="reminders" petId={pets?.[0]?.id} title="New reminder" fields={fields}
            trigger={<Button size="icon" className="rounded-full w-11 h-11 shadow-[var(--shadow-soft)]"><Plus className="w-5 h-5" /></Button>} />
        }
      />
      {!data || data.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] py-10 text-center text-sm text-muted-foreground">No reminders yet</div>
      ) : (
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] divide-y divide-border overflow-hidden">
          {data.map((r) => (
            <div key={r.id} className="px-5 py-4 flex items-start gap-3">
              <Checkbox checked={r.completed} onCheckedChange={(c) => toggle.mutate({ id: r.id, completed: !!c })} className="mt-1" />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${r.completed ? "line-through text-muted-foreground" : ""}`}>{r.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[r.category, r.date, r.time, (r as any).pets?.name].filter(Boolean).join(" • ")}
                </div>
              </div>
              <SubRecordDialog table="reminders" petId={r.pet_id} title="Edit reminder" fields={fields} initial={r}
                trigger={<Button variant="ghost" size="icon" className="rounded-full h-8 w-8"><Pencil className="w-4 h-4" /></Button>} />
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-destructive" onClick={() => del.mutate(r.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}