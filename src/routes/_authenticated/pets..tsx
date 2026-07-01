import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PawPrint, Plus, Pencil, Trash2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  PetFormDialog, SubRecordDialog, type SubFieldDef,
  medicationFields, vaccinationFields, documentFields, expenseFields,
} from "@/lib/pet-forms";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/pets/$id")({
  head: () => ({ meta: [{ title: "Pet — PetKeeper" }] }),
  component: PetDetail,
});

const appointmentFields: SubFieldDef[] = [
  {
    key: "title", label: "Appointment Type", type: "select-other",
    options: ["Veterinary Check-up", "Vaccination", "Grooming", "Dental Care", "Blood Test",
      "Medication Follow-up", "Deworming", "Flea & Tick Treatment", "Weight Check", "Surgery",
      "Emergency", "Other"],
    otherKey: "custom_title", otherLabel: "Custom Appointment Title",
    otherPlaceholder: "Enter a title",
  },
  { key: "date", label: "Date", type: "date" },
  { key: "time", label: "Time", type: "time" },
  { key: "location", label: "Location", type: "text" },
  { key: "provider", label: "Veterinarian / Groomer", type: "text" },
  { key: "notes", label: "Notes", type: "textarea" },
];

const weightFields: SubFieldDef[] = [
  { key: "weight", label: "Weight (kg)", type: "number" },
  { key: "date", label: "Date", type: "date" },
  { key: "notes", label: "Notes", type: "textarea" },
];

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
        <div className="grid grid-cols-2 gap-2 mt-5">
          <PetFormDialog initial={pet} trigger={
            <Button variant="secondary" className="rounded-full h-10"><Pencil className="w-4 h-4 mr-1" />Edit</Button>
          } />
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

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full rounded-full bg-card border border-border p-1 h-11 grid grid-cols-6">
          <TabsTrigger value="overview" className="rounded-full text-[11px]">Overview</TabsTrigger>
          <TabsTrigger value="app" className="rounded-full text-[11px]">Visits</TabsTrigger>
          <TabsTrigger value="med" className="rounded-full text-[11px]">Meds</TabsTrigger>
          <TabsTrigger value="vac" className="rounded-full text-[11px]">Vacc</TabsTrigger>
          <TabsTrigger value="doc" className="rounded-full text-[11px]">Docs</TabsTrigger>
          <TabsTrigger value="exp" className="rounded-full text-[11px]">Cost</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5 space-y-4">
          <InfoList pet={pet} />
          <SubList petId={id} table="weight_entries" title="Weight" primaryKey="weight"
            renderPrimary={(w) => `${w.weight} kg`} secondary={(w) => w.date}
            fields={weightFields} />
        </TabsContent>
        <TabsContent value="app" className="mt-5">
          <SubList petId={id} table="appointments" title="Appointments" primaryKey="title"
            secondary={(a) => `${a.date ?? ""} ${a.time ?? ""} • ${a.location ?? a.provider ?? ""}`}
            fields={appointmentFields} />
        </TabsContent>
        <TabsContent value="med" className="mt-5">
          <SubList petId={id} table="medications" title="Medications" primaryKey="name"
            secondary={(m) => `${m.dosage ?? ""} • ${m.frequency ?? ""}`.trim()}
            fields={medicationFields} />
        </TabsContent>
        <TabsContent value="vac" className="mt-5">
          <SubList petId={id} table="vaccinations" title="Vaccinations" primaryKey="vaccine"
            secondary={(v) => `Given ${v.date_given ?? "—"} • Next ${v.next_due_date ?? "—"}`}
            fields={vaccinationFields} />
        </TabsContent>
        <TabsContent value="doc" className="mt-5">
          <SubList petId={id} table="documents" title="Documents" primaryKey="title"
            secondary={(d) => `${d.type ?? ""} • ${d.date ?? ""}`}
            fields={documentFields}
            openable={(row) => row.file_path}
            openBucket="pet-documents"
            openKey="file_path"
          />
        </TabsContent>
        <TabsContent value="exp" className="mt-5">
          <SubList petId={id} table="expenses" title="Expenses" primaryKey="title"
            secondary={(r) => `${r.amount ?? 0} ${r.currency ?? "USD"} • ${r.category ?? ""} ${r.date ?? ""}`.trim()}
            fields={expenseFields}
            openable={(row) => row.invoice_path}
            openBucket="pet-documents"
            openKey="invoice_path"
          />
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
  openable, openBucket, openKey,
}: {
  petId: string;
  table: "medications" | "vaccinations" | "appointments" | "weight_entries" | "expenses" | "documents";
  title: string;
  primaryKey: string;
  renderPrimary?: (r: any) => string;
  secondary: (r: any) => string;
  fields: SubFieldDef[];
  openable?: (r: any) => string | null | undefined;
  openBucket?: "pet-photos" | "pet-documents";
  openKey?: string;
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
    mutationFn: async (row: any) => {
      if (openKey && row[openKey] && openBucket) await supabase.storage.from(openBucket).remove([row[openKey]]);
      const { error } = await supabase.from(table).delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [table, petId] }); toast.success("Removed"); },
  });

  async function open(row: any) {
    if (!openable || !openBucket || !openKey) return;
    const path = openable(row);
    if (!path) return;
    const { data } = await supabase.storage.from(openBucket).createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

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
              <button className="min-w-0 flex-1 text-left" onClick={() => open(r)}>
                <div className="text-sm font-medium truncate flex items-center gap-1.5">
                  {renderPrimary ? renderPrimary(r) : r[primaryKey]}
                  {openable && openable(r) && <Paperclip className="w-3 h-3 text-muted-foreground" />}
                </div>
                <div className="text-xs text-muted-foreground truncate">{secondary(r)}</div>
              </button>
              <div className="flex items-center gap-1">
                <SubRecordDialog table={table} petId={petId} title={`Edit ${title.slice(0, -1).toLowerCase()}`} fields={fields} initial={r}
                  trigger={<Button variant="ghost" size="icon" className="rounded-full h-8 w-8"><Pencil className="w-4 h-4" /></Button>}
                />
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-destructive" onClick={() => del.mutate(r)}>
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
