import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PawPrint, Plus, Pencil, Trash2, Archive, Heart, MoreVertical, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  PetFormDialog, SubRecordDialog, type SubFieldDef,
  calculateAge, formatTime,
  medicationFields, vaccinationFields, expenseFields,
} from "@/lib/pet-forms";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDelete } from "@/components/confirm-delete";

export const Route = createFileRoute("/_authenticated/pets/$id")({
  head: () => ({ meta: [{ title: "Huisdier — PetKeeper" }] }),
  component: PetDetail,
});

function PetDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deceasedOpen, setDeceasedOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deceasedDate, setDeceasedDate] = useState("");
  const [memorialNote, setMemorialNote] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const editTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteInputRef = useRef<HTMLInputElement>(null);

  const { data: pet, isLoading } = useQuery({
    queryKey: ["pet", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pets").select("*").eq("id", id).neq("status", "deleted").is("deleted_at", null).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async () => {
      const deletedAt = new Date().toISOString();
      const { error } = await supabase
        .from("pets")
        .update({ status: "deleted", deleted_at: deletedAt, updated_at: deletedAt } as any)
        .eq("id", id);
      if (error) throw error;
    },
  });

  const archive = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pets").update({ status: "archived" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Huisdier gearchiveerd");
      navigate({ to: "/pets" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const restore = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pets").update({ status: "active", deceased_date: null, memorial_note: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Huisdier teruggeplaatst");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markDeceased = useMutation({
    mutationFn: async (payload: { deceased_date: string; memorial_note: string }) => {
      const { error } = await supabase.from("pets").update({
        status: "deceased",
        deceased_date: payload.deceased_date || null,
        memorial_note: payload.memorial_note || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Gemarkeerd als overleden");
      navigate({ to: "/pets" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-center py-16 text-muted-foreground">Laden…</div>;
  if (!pet) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="mb-4">Huisdier niet gevonden.</p>
        <Button asChild className="rounded-full"><Link to="/home">Naar Home</Link></Button>
      </div>
    );
  }

  const status = (pet as any).status ?? "active";
  const isArchived = status !== "active";
  const isDeleteConfirmed = deleteConfirm.trim().toUpperCase() === "DELETE";
  const isDeleteBusy = del.isPending || deleteSubmitting;
  const handlePermanentDelete = async (form?: HTMLFormElement | null) => {
    if (isDeleteBusy) return;

    const formConfirmation = form ? String(new FormData(form).get("deleteConfirmation") ?? "") : "";
    const typedConfirmation = formConfirmation || deleteInputRef.current?.value || deleteConfirm;
    const confirmed = typedConfirmation.trim().toUpperCase() === "DELETE";
    console.log("[PetKeeper] Permanent verwijderen knop geklikt", { petId: id, status, confirmed });
    setDeleteError(null);

    if (!confirmed) {
      const message = "Typ DELETE om permanent verwijderen te bevestigen.";
      setDeleteError(message);
      toast.error(message);
      return;
    }

    setDeleteSubmitting(true);
    try {
      await del.mutateAsync();
      console.log("[PetKeeper] Permanent verwijderen uitgevoerd", { petId: id, status: "deleted" });
      setDeleteOpen(false);
      setDeleteConfirm("");
      qc.removeQueries({ queryKey: ["pet", id] });
      await qc.invalidateQueries();
      toast.success("Huisdier permanent verwijderd.");
      navigate({ to: "/home" });
    } catch (error: any) {
      console.error("[PetKeeper] Permanent verwijderen mislukt", error);
      const message = error?.message || "Permanent verwijderen is mislukt.";
      setDeleteError(message);
      toast.error(message);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <>
      <Link to="/pets" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Huisdieren
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-medium truncate">{pet.name}</h1>
              {status === "deceased" && <span className="text-[10px] uppercase tracking-widest text-muted-foreground border border-border rounded-full px-2 py-0.5">In herinnering</span>}
              {status === "archived" && <span className="text-[10px] uppercase tracking-widest text-muted-foreground border border-border rounded-full px-2 py-0.5">Gearchiveerd</span>}
            </div>
            <div className="text-sm text-muted-foreground">{[pet.breed, pet.species].filter(Boolean).join(" • ") || "—"}</div>
            {pet.birth_date && (
              <div className="text-xs text-muted-foreground mt-0.5">{calculateAge(pet.birth_date)}</div>
            )}
            {status === "deceased" && (pet as any).deceased_date && (
              <div className="text-xs text-muted-foreground mt-0.5">Overleden op {(pet as any).deceased_date}</div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 shrink-0"><MoreVertical className="w-5 h-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl min-w-52">
              <DropdownMenuItem onSelect={() => setTimeout(() => editTriggerRef.current?.click(), 0)}>
                <Pencil className="w-4 h-4 mr-2" /> ✏️ Huisdier bewerken
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isArchived && (
                <DropdownMenuItem onSelect={() => setRestoreOpen(true)}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Terugplaatsen
                </DropdownMenuItem>
              )}
              {!isArchived && (
                <>
                  <DropdownMenuItem onSelect={() => setDeceasedOpen(true)}>
                    <Heart className="w-4 h-4 mr-2" /> 🕊️ Markeer als overleden
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setArchiveOpen(true)}>
                    <Archive className="w-4 h-4 mr-2" /> 📦 Huisdier archiveren
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> 🗑️ Permanent verwijderen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Hidden trigger so the Actions menu can open the edit dialog */}
        <PetFormDialog initial={pet} trigger={<button ref={editTriggerRef} type="button" className="hidden" aria-hidden />} />
        <div className="grid grid-cols-2 gap-2 mt-5">
          <PetFormDialog initial={pet} trigger={
            <Button variant="secondary" className="rounded-full h-10"><Pencil className="w-4 h-4 mr-1" />Bewerken</Button>
          } />
          <Button variant="secondary" className="rounded-full h-10" asChild>
            <a href="#info">Overzicht</a>
          </Button>
        </div>
        {status === "deceased" && (pet as any).memorial_note && (
          <div className="mt-4 p-4 rounded-2xl bg-secondary/40 border border-border text-sm italic text-muted-foreground whitespace-pre-line">
            {(pet as any).memorial_note}
          </div>
        )}
      </div>

      {/* Mark as deceased */}
      <Dialog open={deceasedOpen} onOpenChange={setDeceasedOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader><DialogTitle className="font-display text-2xl">Huisdier markeren als overleden?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Alle medische gegevens, documenten, kosten, afspraken en notities blijven veilig bewaard, maar het huisdier wordt gemarkeerd als overleden en verborgen uit de lijst met actieve huisdieren.</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Datum van overlijden</Label>
              <Input type="date" value={deceasedDate} onChange={(e) => setDeceasedDate(e.target.value)} className="rounded-xl h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Herdenkingsnotitie</Label>
              <Textarea value={memorialNote} onChange={(e) => setMemorialNote(e.target.value)} className="rounded-xl" placeholder="Een mooie herinnering…" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setDeceasedOpen(false)} className="rounded-full h-11 flex-1">Annuleren</Button>
            <Button onClick={() => { markDeceased.mutate({ deceased_date: deceasedDate, memorial_note: memorialNote }); setDeceasedOpen(false); }} className="rounded-full h-11 flex-1">Bevestigen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{pet.name} archiveren?</AlertDialogTitle>
            <AlertDialogDescription>Gebruik dit wanneer het huisdier niet meer bij jou is, maar je de gegevens wilt bewaren. Het huisdier wordt verborgen uit de actieve lijst en verplaatst naar Gearchiveerde huisdieren.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => archive.mutate()} className="rounded-full">Archiveren</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore */}
      <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{pet.name} terugplaatsen?</AlertDialogTitle>
            <AlertDialogDescription>
              {status === "deceased"
                ? "Weet je zeker dat je dit overleden huisdier terug wilt zetten als actief? De overlijdensdatum en herdenkingsnotitie worden gewist."
                : "Het huisdier verschijnt weer in je actieve lijst."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => restore.mutate()} className="rounded-full">Terugplaatsen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent delete */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { if (isDeleteBusy) return; setDeleteOpen(o); if (!o) { setDeleteConfirm(""); setDeleteError(null); } }}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader><DialogTitle className="font-display text-2xl text-destructive">Dit huisdier permanent verwijderen?</DialogTitle></DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handlePermanentDelete(event.currentTarget);
            }}
          >
            <p className="text-sm text-muted-foreground">Dit verbergt het huisdier en alle gekoppelde gegevens overal in de app. Dit kan niet ongedaan worden gemaakt.</p>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Typ <span className="font-mono text-destructive">DELETE</span> om te bevestigen</Label>
              <Input
                ref={deleteInputRef}
                name="deleteConfirmation"
                value={deleteConfirm}
                onInput={(e) => { setDeleteConfirm(e.currentTarget.value); setDeleteError(null); }}
                onChange={(e) => { setDeleteConfirm(e.target.value); setDeleteError(null); }}
                autoComplete="off"
                autoCapitalize="characters"
                className="rounded-xl h-11"
                placeholder="DELETE"
              />
            </div>
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="secondary" disabled={isDeleteBusy} onClick={() => setDeleteOpen(false)} className="rounded-full h-11 flex-1">Annuleren</Button>
              <Button
                type="button"
                aria-busy={isDeleteBusy}
                onClick={(event) => void handlePermanentDelete(event.currentTarget.form)}
                className="rounded-full h-11 flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleteBusy ? "Verwijderen…" : "Permanent verwijderen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full rounded-full bg-card border border-border p-1 h-11 grid grid-cols-6">
          <TabsTrigger value="info" className="rounded-full text-[11px]">Overzicht</TabsTrigger>
          <TabsTrigger value="app" className="rounded-full text-[11px]">Afspraken</TabsTrigger>
          <TabsTrigger value="med" className="rounded-full text-[11px]">Medicatie</TabsTrigger>
          <TabsTrigger value="vac" className="rounded-full text-[11px]">Vaccinaties</TabsTrigger>
          <TabsTrigger value="doc" className="rounded-full text-[11px]">Documenten</TabsTrigger>
          <TabsTrigger value="exp" className="rounded-full text-[11px]">Kosten</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-5" id="info">
          <InfoList pet={pet} />
        </TabsContent>
        <TabsContent value="app" className="mt-5">
          <SubList petId={id} table="appointments" title="Afspraken" primaryKey="title"
            secondary={(a) => `${a.date ?? ""} ${formatTime(a.time)} • ${a.location ?? ""}`.trim()}
            fields={[
              { key: "title", label: "Titel", type: "text" },
              { key: "date", label: "Datum", type: "date" },
              { key: "time", label: "Tijd", type: "time" },
              { key: "location", label: "Locatie", type: "text" },
              { key: "provider", label: "Dierenarts / Trimmer", type: "text" },
              { key: "notes", label: "Notities", type: "textarea" },
            ]}
          />
        </TabsContent>
        <TabsContent value="med" className="mt-5">
          <SubList petId={id} table="medications" title="Medicatie" primaryKey="name"
            secondary={(m) => `${m.dosage ?? ""} ${m.frequency ?? ""}`.trim() || "—"}
            fields={medicationFields}
          />
        </TabsContent>
        <TabsContent value="vac" className="mt-5">
          <SubList petId={id} table="vaccinations" title="Vaccinaties" primaryKey="vaccine"
            secondary={(v) => `Gegeven ${v.date_given ?? "—"} • Volgende ${v.next_due_date ?? "—"}`}
            fields={vaccinationFields}
          />
        </TabsContent>
        <TabsContent value="doc" className="mt-5">
          <DocsList petId={id} />
        </TabsContent>
        <TabsContent value="exp" className="mt-5">
          <SubList petId={id} table="expenses" title="Kosten" primaryKey="title"
            renderPrimary={(r) => `${r.title}`}
            secondary={(r) => `${new Intl.NumberFormat("nl-NL", { style: "currency", currency: r.currency || "EUR" }).format(Number(r.amount || 0))} • ${r.category ?? ""} ${r.date ?? ""}`.trim()}
            fields={expenseFields}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

function InfoList({ pet }: { pet: any }) {
  const rows: Array<[string, string | null]> = [
    ["Soort", pet.species],
    ["Ras", pet.breed],
    ["Geslacht", pet.gender],
    ["Geboortedatum", pet.birth_date],
    ["Leeftijd", calculateAge(pet.birth_date) || null],
    ["Gewicht", pet.weight ? `${pet.weight} kg` : null],
    ["Kleur", pet.color],
    ["Gecastreerd / Gesteriliseerd", pet.is_neutered == null ? null : pet.is_neutered ? "Ja" : "Nee"],
    ["Chipnummer", pet.microchip_number],
    ["Paspoortnummer", pet.passport_number],
    ["Vaste dierenarts", pet.vet_name],
    ["Allergieën", pet.allergies],
    ["Chronische aandoeningen", pet.chronic_conditions],
    ["Verzekerd", pet.is_insured == null ? null : pet.is_insured ? "Ja" : "Nee"],
    ["Notities", pet.notes],
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: [table, petId] }); toast.success("Verwijderd"); },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg">{title}</h3>
        <SubRecordDialog table={table} petId={petId} title={`Nieuw`} fields={fields}
          trigger={<Button size="sm" className="rounded-full h-9"><Plus className="w-4 h-4 mr-1" />Toevoegen</Button>}
        />
      </div>
      {!data || data.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] py-8 text-center text-sm text-muted-foreground">Nog niets hier</div>
      ) : (
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] divide-y divide-border overflow-hidden">
          {data.map((r: any) => (
            <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{renderPrimary ? renderPrimary(r) : r[primaryKey]}</div>
                <div className="text-xs text-muted-foreground truncate">{secondary(r)}</div>
              </div>
              <div className="flex items-center gap-1">
                <SubRecordDialog table={table} petId={petId} title={`Bewerken`} fields={fields} initial={r}
                  trigger={<Button variant="ghost" size="icon" className="rounded-full h-8 w-8"><Pencil className="w-4 h-4" /></Button>}
                />
                <ConfirmDelete onConfirm={() => del.mutate(r.id)} />
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents", petId] }); toast.success("Verwijderd"); },
  });

  async function openDoc(row: any) {
    if (!row.file_path) return;
    const { data } = await supabase.storage.from("pet-documents").createSignedUrl(row.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg">Documenten</h3>
        <UploadDocDialog petId={petId} />
      </div>
      {!data || data.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] py-8 text-center text-sm text-muted-foreground">Nog geen documenten</div>
      ) : (
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] divide-y divide-border overflow-hidden">
          {data.map((r) => (
            <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-3">
              <button className="text-left min-w-0 flex-1" onClick={() => openDoc(r)}>
                <div className="text-sm font-medium truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground truncate">{r.date || ""} {r.notes ? `• ${r.notes}` : ""}</div>
              </button>
              <ConfirmDelete onConfirm={() => del.mutate(r)} title="Document verwijderen?" />
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
      toast.success("Document geüpload");
      setOpen(false); setTitle(""); setDate(""); setNotes(""); setFile(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="rounded-full h-9"><Plus className="w-4 h-4 mr-1" />Uploaden</Button></DialogTrigger>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader><DialogTitle className="font-display text-2xl">Document uploaden</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Titel</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl h-11" /></div>
          <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Bestand</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="rounded-xl h-11" /></div>
          <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Datum</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl h-11" /></div>
          <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Notities</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl" /></div>
          <DialogFooter>
            <Button type="submit" disabled={mut.isPending} className="w-full h-12 rounded-full">
              {mut.isPending ? "Uploaden…" : "Uploaden"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}