import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { SubRecordDialog } from "@/lib/pet-forms";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — PetKeeper" }] }),
  component: ExpensesPage,
});

const fields = [
  { key: "title", label: "Title", type: "text" as const },
  { key: "amount", label: "Amount", type: "number" as const },
  { key: "currency", label: "Currency", type: "select" as const, options: ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"] },
  { key: "category", label: "Category", type: "select" as const, options: ["Food", "Vet", "Grooming", "Medication", "Toys", "Insurance", "Boarding", "Other"] },
  { key: "date", label: "Date", type: "date" as const },
  { key: "notes", label: "Notes", type: "textarea" as const },
];

function ExpensesPage() {
  const qc = useQueryClient();
  const { data: pets } = useQuery({
    queryKey: ["pets"],
    queryFn: async () => (await supabase.from("pets").select("id,name")).data ?? [],
  });
  const { data } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, pets(name)")
        .order("date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Removed"); },
  });

  const now = new Date();
  const monthKey = format(now, "yyyy-MM");
  const total = (data ?? []).reduce((s, r: any) => s + Number(r.amount || 0), 0);
  const monthTotal = (data ?? []).filter((r: any) => (r.date ?? "").startsWith(monthKey))
    .reduce((s, r: any) => s + Number(r.amount || 0), 0);
  const currency = (data?.[0] as any)?.currency ?? "USD";
  const fmt = (n: number, c: string) => new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(n);

  return (
    <>
      <PageHeader
        subtitle="Care spending"
        title="Expenses"
        action={
          <SubRecordDialog
            table="expenses"
            petId={pets?.[0]?.id}
            title="New expense"
            fields={fields}
            trigger={<Button size="icon" className="rounded-full w-11 h-11 shadow-[var(--shadow-soft)]"><Plus className="w-5 h-5" /></Button>}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">This month</div>
          <div className="font-display text-2xl">{fmt(monthTotal, currency)}</div>
        </div>
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">All time</div>
          <div className="font-display text-2xl">{fmt(total, currency)}</div>
        </div>
      </div>

      {!data || data.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] p-10 text-center">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--gradient-champagne)" }}>
            <Wallet className="w-6 h-6 text-primary-foreground" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-muted-foreground">No expenses yet</p>
        </div>
      ) : (
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] divide-y divide-border overflow-hidden">
          {data.map((r: any) => (
            <div key={r.id} className="px-5 py-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[r.category, r.date, r.pets?.name].filter(Boolean).join(" • ")}
                </div>
              </div>
              <div className="text-sm font-medium whitespace-nowrap">{fmt(Number(r.amount || 0), r.currency || "USD")}</div>
              <SubRecordDialog table="expenses" petId={r.pet_id} title="Edit expense" fields={fields} initial={r}
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