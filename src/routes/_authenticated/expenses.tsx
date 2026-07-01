import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Wallet, CheckCircle2, Circle, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { SubRecordDialog, expenseFields } from "@/lib/pet-forms";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — PetKeeper" }] }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const qc = useQueryClient();
  const { data: pets } = useQuery({
    queryKey: ["pets"],
    queryFn: async () => (await supabase.from("pets").select("id,name").eq("status","active").is("deleted_at", null).order("name")).data ?? [],
  });
  const { data } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, pets(name,status,deleted_at)")
        .order("date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((row: any) => !row.pet_id || (!!row.pets && row.pets.status !== "deleted" && !row.pets.deleted_at));
    },
  });

  const del = useMutation({
    mutationFn: async (row: any) => {
      if (row.invoice_path) await supabase.storage.from("pet-documents").remove([row.invoice_path]);
      const { error } = await supabase.from("expenses").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Verwijderd"); },
  });

  const monthKey = format(new Date(), "yyyy-MM");
  const currency = (data?.[0] as any)?.currency ?? "EUR";
  const fmt = (n: number, c: string) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: c || "EUR" }).format(n);
  const monthTotal = (data ?? []).filter((r: any) => (r.date ?? "").startsWith(monthKey))
    .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const total = (data ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const perPet = new Map<string, number>();
  (data ?? []).forEach((r: any) => {
    const key = r.pets?.name ?? "Onbekend";
    perPet.set(key, (perPet.get(key) ?? 0) + Number(r.amount || 0));
  });

  async function openInvoice(row: any) {
    if (!row.invoice_path) return;
    const { data } = await supabase.storage.from("pet-documents").createSignedUrl(row.invoice_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <>
      <PageHeader
        subtitle="Uitgaven aan verzorging"
        title="Kosten"
        action={
          <SubRecordDialog
            table="expenses"
            pets={pets ?? []}
            title="Nieuwe kostenpost"
            fields={expenseFields}
            trigger={<Button size="icon" className="rounded-full w-11 h-11 shadow-[var(--shadow-soft)]"><Plus className="w-5 h-5" /></Button>}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{format(new Date(), "MMMM yyyy", { locale: nl })}</div>
          <div className="font-display text-2xl">{fmt(monthTotal, currency)}</div>
        </div>
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Totaal</div>
          <div className="font-display text-2xl">{fmt(total, currency)}</div>
        </div>
      </div>

      {perPet.size > 0 && (
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] p-4 mb-6">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Per huisdier</div>
          <div className="space-y-1.5">
            {Array.from(perPet.entries()).map(([name, sum]) => (
              <div key={name} className="flex justify-between text-sm">
                <span className="text-foreground">{name}</span>
                <span className="font-medium">{fmt(sum, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-display text-lg mb-3">Recente kosten</h2>

      {!data || data.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] p-10 text-center">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--gradient-champagne)" }}>
            <Wallet className="w-6 h-6 text-primary-foreground" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-muted-foreground">Nog geen kosten</p>
        </div>
      ) : (
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] divide-y divide-border overflow-hidden">
          {data.map((r: any) => (
            <div key={r.id} className="px-5 py-4 flex items-start gap-3">
              <button onClick={() => openInvoice(r)} className="mt-0.5 text-muted-foreground" title={r.invoice_path ? "Factuur openen" : "Geen factuur"}>
                {r.paid ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate flex items-center gap-1.5">
                  {r.title}
                  {r.invoice_path && <Paperclip className="w-3 h-3 text-muted-foreground" />}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {[r.category, r.date, r.pets?.name].filter(Boolean).join(" • ")}
                </div>
              </div>
              <div className="text-sm font-medium whitespace-nowrap">{fmt(Number(r.amount || 0), r.currency || "EUR")}</div>
              <SubRecordDialog table="expenses" pets={pets ?? []} title="Kosten bewerken" fields={expenseFields} initial={r}
                trigger={<Button variant="ghost" size="icon" className="rounded-full h-8 w-8"><Pencil className="w-4 h-4" /></Button>} />
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-destructive" onClick={() => del.mutate(r)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
