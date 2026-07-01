import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PawPrint, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PetFormDialog, SubRecordDialog, type SubFieldDef } from "@/lib/pet-forms";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/pets/$id")({
  head: () => ({ meta: [{ title: "Pet — PetKeeper" }] }),
  component: PetDetail,
});

function PetDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: pet, isLoading } = useQuery({
    queryKey: ["pet", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pets").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pets"] });
      toast.success("Pet removed");
      navigate({ to: "/pets" });
    },
  });

  if (isLoading || !pet) return <div className="text-center py-16 text-muted-foreground">Loading…</div>;

  return (
    <>
      <Link to="/pets" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Pets
      </Link>

      <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] p-5 mb-6">
        <div className="flex items-center gap-4">
          {pet.photo_url ? (
            <img src={pet.photo_url} alt={pet.name} className="w-20 h-20 rounded-2xl object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "var(--gradient-surface)" }}>
              <PawPrint className="w-9 h-9 text-primary" strokeWidth={1.5} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-medium truncate">{pet.name}</h1>
            <div className="text-sm text-muted-foreground">{[pet.breed, pet.species].filter(Boolean).join(" • ") || "—"}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-5">
          <PetFormDialog initial={pet} trigger={
            <Button variant="secondary" className="rounded-full h-10"><Pencil className="w-4 h-4 mr-1" />Edit</Button>
          } />
          <Button variant="secondary" className="rounded-full h-10" asChild>
            <a href="#info">Info</a>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="secondary" className="rounded-full h-10 text-destructive"><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Remove {pet.name}?</AlertDialogTitle>
                <AlertDialogDescription>This deletes the pet and all related records. This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => del.mutate()} className="rounded-full">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full rounded-full bg-card border border-border p-1 h-11 grid grid-cols-7">
          <TabsTrigger value="info" className="rounded-full text-[11px]">Info</TabsTrigger>
          <TabsTrigger value="med" className="rounded-full text-[11px]">Meds</TabsTrigger>
          <TabsTrigger value="vac" className="rounded-full text-[11px]">Vacc</TabsTrigger>
          <TabsTrigger value="app" className="rounded-full text-[11px]">Visits</TabsTrigger>
          <TabsTrigger value="wgt" className="rounded-full text-[11px]">Wgt</TabsTrigger>
          <TabsTrigger value="exp" className="rounded-full text-[11px]">Cost</TabsTrigger>
          <TabsTrigger value="doc" className="rounded-full text-[11px]">Docs</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-5" id="info">
          <InfoList pet={pet} />
        </TabsContent>
        <TabsContent value="med" className="mt-5">
          <SubList petId={id} table="medications" title="Medications" primaryKey="name"
            secondary={(m) => `${m.dosage ?? ""} ${m.frequency ?? ""}`.trim() || "—"}
            fields={[
              { key: "name", label: "Medication name", type: "text" },
              { key: "dosage", label: "Dosage", type: "text" },
              { key: "frequency", label: "Frequency", type: "text" },
              { key: "start_date", label: "Start date", type: "date" },
              { key: "end_date", label: "End date", type: "date" },
              { key: "notes", label: "Notes", type: "textarea" },
            ]}
          />
        </TabsContent>
        <TabsContent value="vac" className="mt-5">
          <SubList petId={id} table="vaccinations" title="Vaccinations" primaryKey="vaccine"
            secondary={(v) => `Given ${v.date_given ?? "—"} • Next ${v.next_due_date ?? "—"}`}
            fields={[
              { key: "vaccine", label: "Vaccine", type: "text" },
              { key: "date_given", label: "Date given", type: "date" },
              { key: "next_due_date", label: "Next due", type: "date" },
              { key: "notes", label: "Notes", type: "textarea" },
            ]}
          />
        </TabsContent>
        <TabsContent value="app" className="mt-5">
          <SubList petId={id} table="appointments" title="Appointments" primaryKey="title"
            secondary={(a) => `${a.date ?? ""} ${a.time ?? ""} • ${a.location ?? ""}`}
            fields={[
              { key: "title", label: "Title", type: "text" },
              { key: "date", label: "Date", type: "date" },
              { key: "time", label: "Time", type: "time" },
              { key: "location", label: "Location", type: "text" },
              { key: "type", label: "Type", type: "select", options: ["Vet", "Grooming", "Training", "Other"] },
              { key: "notes", label: "Notes", type: "textarea" },
            ]}
          />
        </TabsContent>
        <TabsContent value="wgt" className="mt-5">
          <SubList petId={id} table="weight_entries" title="Weight" primaryKey="weight"
            renderPrimary={(w) => `${w.weight} kg`}
            secondary={(w) => w.date}
            fields={[
              { key: "weight", label: "Weight (kg)", type: "number" },
              { key: "date", label: "Date", type: "date" },
              { key: "notes", label: "Notes", type: "textarea" },
            ]}
          />
        </TabsContent>
        <TabsContent value="exp" className="mt-5">
          <SubList petId={id} table="expenses" title="Expenses" primaryKey="title"
            renderPrimary={(r) => `${r.title}`}
            secondary={(r) => `${r.amount ?? 0} ${r.currency ?? "USD"} • ${r.category ?? ""} ${r.date ?? ""}`.trim()}
            fields={[
              { key: "title", label: "Title", type: "text" },
              { key: "amount", label: "Amount", type: "number" },
              { key: "currency", label: "Currency", type: "select", options: ["USD","EUR","GBP","CAD","AUD","JPY"] },
              { key: "category", label: "Category", type: "select", options: ["Food","Vet","Grooming","Medication","Toys","Insurance","Boarding","Other"] },
              { key: "date", label: "Date", type: "date" },
              { key: "notes", label: "Notes", type: "textarea" },
            ]}
          />
        </TabsContent>
        <TabsContent value="doc" className="mt-5">
          <DocsList petId={id} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function InfoList({ pet }: { pet: any }) {
  const rows: Array<[string, string | null]> = [
    ["Species", pet.species],
    ["Breed", pet.breed],
    ["Gender", pet.gender],
    ["Birth date", pet.birth_date],
    ["Weight", pet.weight ? `${pet.weight} kg` : null],
    ["Color", pet.color],
    ["Microchip", pet.microchip_number],
    ["Passport", pet.passport_number],
    ["Notes", pet.notes],
  ];
  return (
    <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] divide-y divide-border overflow-hidden">
      {rows.map(([k, v]) => (
        <div key={k} className="px-5 py-3.5 flex justify-between gap-4">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{k}</span>
          <span className="text-sm text-right">{v || "—"}</span>
        </div>
      ))}
    </div>
  );
}

function SubList({
  petId, table, title, primaryKey, renderPrimary, secondary, fields,
}: {
  petId: string;
  table: "medications" | "vaccinations" | "appointments" | "weight_entries" | "expenses";
  title: string;
  primaryKey: string;
  renderPrimary?: (r: any) => string;
  secondary: (r: any) => string;
  fields: SubFieldDef[];
}) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: [table, petId],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").eq("pet_id", petId).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const del = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await supabase.from(table).delete().eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [table, petId] }); toast.success("Removed"); },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg">{title}</h3>
        <SubRecordDialog table={table} petId={petId} title={`New ${title.slice(0, -1).toLowerCase()}`} fields={fields}
          trigger={<Button size="sm" className="rounded-full h-9"><Plus className="w-4 h-4 mr-1" />Add</Button>}
        />
      </div>
      {!data || data.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] py-8 text-center text-sm text-muted-foreground">Nothing here yet</div>
      ) : (
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] divide-y divide-border overflow-hidden">
          {data.map((r: any) => (
            <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{renderPrimary ? renderPrimary(r) : r[primaryKey]}</div>
                <div className="text-xs text-muted-foreground truncate">{secondary(r)}</div>
              </div>
              <div className="flex items-center gap-1">
                <SubRecordDialog table={table} petId={petId} title={`Edit ${title.slice(0, -1).toLowerCase()}`} fields={fields} initial={r}
                  trigger={<Button variant="ghost" size="icon" className="rounded-full h-8 w-8"><Pencil className="w-4 h-4" /></Button>}
                />
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-destructive" onClick={() => del.mutate(r.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DocsList({ petId }: { petId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["documents", petId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("pet_id", petId).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (row: any) => {
      if (row.file_path) await supabase.storage.from("pet-documents").remove([row.file_path]);
      const { error } = await supabase.from("documents").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents", petId] }); toast.success("Removed"); },
  });

  async function openDoc(row: any) {
    if (!row.file_path) return;
    const { data } = await supabase.storage.from("pet-documents").createSignedUrl(row.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg">Documents</h3>
        <UploadDocDialog petId={petId} />
      </div>
      {!data || data.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] py-8 text-center text-sm text-muted-foreground">No documents yet</div>
      ) : (
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] divide-y divide-border overflow-hidden">
          {data.map((r) => (
            <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-3">
              <button className="text-left min-w-0 flex-1" onClick={() => openDoc(r)}>
                <div className="text-sm font-medium truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground truncate">{r.date || ""} {r.notes ? `• ${r.notes}` : ""}</div>
              </button>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-destructive" onClick={() => del.mutate(r)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UploadDocDialog({ petId }: { petId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      let file_path: string | null = null;
      if (file) {
        file_path = `${uid}/${crypto.randomUUID()}-${file.name}`;
        const up = await supabase.storage.from("pet-documents").upload(file_path, file);
        if (up.error) throw up.error;
      }
      const { error } = await supabase.from("documents").insert({
        user_id: uid, pet_id: petId, title, date: date || null, notes: notes || null, file_path,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", petId] });
      toast.success("Document uploaded");
      setOpen(false); setTitle(""); setDate(""); setNotes(""); setFile(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="rounded-full h-9"><Plus className="w-4 h-4 mr-1" />Upload</Button></DialogTrigger>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader><DialogTitle className="font-display text-2xl">Upload document</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl h-11" /></div>
          <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">File</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="rounded-xl h-11" /></div>
          <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl h-11" /></div>
          <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl" /></div>
          <DialogFooter>
            <Button type="submit" disabled={mut.isPending} className="w-full h-12 rounded-full">
              {mut.isPending ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}