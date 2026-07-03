import { useState, useRef, useMemo, type ReactNode } from "react";
import { Camera, PawPrint } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

/* --------- Pet form dialog ---------- */

export type PetRow = {
  id: string;
  name: string;
  species: string | null;
  breed: string | null;
  gender: string | null;
  birth_date: string | null;
  weight: number | null;
  color: string | null;
  microchip_number: string | null;
  passport_number: string | null;
  notes: string | null;
  photo_url: string | null;
  is_neutered?: boolean | null;
  vet_name?: string | null;
  allergies?: string | null;
  chronic_conditions?: string | null;
  is_insured?: boolean | null;
};

/* --------- Species & breeds ---------- */

export const SPECIES_OPTIONS = [
  "Hond", "Kat", "Konijn", "Cavia", "Hamster",
  "Vogel", "Reptiel", "Paard", "Vis", "Anders",
] as const;

export const BREEDS_BY_SPECIES: Record<string, string[]> = {
  Hond: ["Labrador", "Golden Retriever", "Duitse Herder", "Bulldog", "Chihuahua", "Border Collie", "Jack Russell", "Beagle", "Teckel", "Poedel", "Franse Bulldog", "Boxer", "Rottweiler", "Husky", "Kruising", "Anders"],
  Kat: ["Europees Korthaar", "Britse Korthaar", "Maine Coon", "Perzisch", "Ragdoll", "Siamees", "Bengaal", "Noorse Boskat", "Sphynx", "Kruising", "Anders"],
  Konijn: ["Hollander", "Dwerg", "Rex", "Vlaamse Reus", "Angora", "Lop / Hangoor", "Anders"],
  Cavia: ["Gladhaar", "Rozet", "Peruaan", "Rex", "Anders"],
  Hamster: ["Syrische", "Dwerghamster", "Roborovski", "Russische", "Anders"],
  Vogel: ["Kanarie", "Parkiet", "Valkparkiet", "Ara", "Papegaai", "Kaketoe", "Anders"],
  Reptiel: ["Baardagaam", "Luipaardgekko", "Schildpad", "Slang", "Leguaan", "Anders"],
  Paard: ["KWPN", "Fries", "Shetlander", "Arabier", "Haflinger", "Welsh Pony", "Anders"],
  Vis: ["Goudvis", "Koi", "Guppy", "Betta", "Neon Tetra", "Anders"],
  Anders: ["Anders"],
};

/* Age calculator (Dutch) */
export function calculateAge(birthDate?: string | null): string {
  if (!birthDate) return "";
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return "";
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  let months = now.getMonth() - b.getMonth();
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  if (years <= 0 && months <= 0) return "Pasgeboren";
  if (years <= 0) return `${months} ${months === 1 ? "maand" : "maanden"}`;
  if (months === 0) return `${years} ${years === 1 ? "jaar" : "jaar"}`;
  return `${years} ${years === 1 ? "jaar" : "jaar"}, ${months} mnd`;
}

/* Formats "HH:MM:SS" → "HH:MM" (safe for null/undefined) */
export function formatTime(t?: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

export function PetFormDialog({
  trigger, initial, onSaved,
}: {
  trigger: ReactNode;
  initial?: Partial<PetRow>;
  onSaved?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    species: initial?.species ?? "",
    breed: initial?.breed ?? "",
    gender: initial?.gender ?? "",
    birth_date: initial?.birth_date ?? "",
    weight: initial?.weight?.toString() ?? "",
    color: initial?.color ?? "",
    microchip_number: initial?.microchip_number ?? "",
    passport_number: initial?.passport_number ?? "",
    notes: initial?.notes ?? "",
    is_neutered: initial?.is_neutered ?? false,
    vet_name: initial?.vet_name ?? "",
    allergies: initial?.allergies ?? "",
    chronic_conditions: initial?.chronic_conditions ?? "",
    is_insured: initial?.is_insured ?? false,
  });
  const [file, setFile] = useState<File | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user!.id;
      let photo_url = initial?.photo_url ?? null;
      if (file) {
        const path = `${userId}/${crypto.randomUUID()}-${file.name}`;
        const up = await supabase.storage.from("pet-photos").upload(path, file, { upsert: true });
        if (up.error) throw up.error;
        const { data: signed } = await supabase.storage.from("pet-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
        photo_url = signed?.signedUrl ?? path;
      }
      const payload = {
        user_id: userId,
        name: form.name,
        species: form.species || null,
        breed: form.breed || null,
        gender: form.gender || null,
        birth_date: form.birth_date || null,
        weight: form.weight ? Number(form.weight) : null,
        color: form.color || null,
        microchip_number: form.microchip_number || null,
        passport_number: form.passport_number || null,
        notes: form.notes || null,
        photo_url,
        is_neutered: form.is_neutered,
        vet_name: form.vet_name || null,
        allergies: form.allergies || null,
        chronic_conditions: form.chronic_conditions || null,
        is_insured: form.is_insured,
      };
      if (initial?.id) {
        const { error } = await supabase.from("pets").update(payload).eq("id", initial.id);
        if (error) throw error;
        return initial.id;
      } else {
        const { data, error } = await supabase.from("pets").insert(payload).select("id").single();
        if (error) throw error;
        return data.id as string;
      }
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["pets"] });
      qc.invalidateQueries({ queryKey: ["pet", id] });
      toast.success(initial?.id ? "Huisdier bijgewerkt" : "Huisdier toegevoegd");
      setOpen(false);
      onSaved?.(id);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const breedList = BREEDS_BY_SPECIES[form.species] ?? [];
  const age = calculateAge(form.birth_date);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-md max-h-[95dvh] rounded-3xl flex flex-col gap-0 p-0 overflow-hidden bg-background border-none">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="font-display text-[26px] leading-tight">
            {initial?.id ? "Huisdier bewerken" : "Nieuw huisdier"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {initial?.id ? "Werk de gegevens bij." : "Vul de gegevens in om te beginnen."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="pet-form"
          onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
          className="flex-1 overflow-y-auto px-5 pt-4 pb-6 space-y-5"
        >
          {/* Circular photo picker */}
          <PhotoPicker
            file={file}
            initialUrl={initial?.photo_url ?? null}
            onChange={setFile}
          />

          <Card title="Basisgegevens" eyebrow="01">
            <Field label="Naam">
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl h-12" placeholder="Bijv. Luna" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Soort">
                <Select value={form.species || undefined} onValueChange={(v) => setForm({ ...form, species: v, breed: "" })}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Kies" /></SelectTrigger>
                  <SelectContent>
                    {SPECIES_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Geslacht">
                <Select value={form.gender || undefined} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Kies" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mannelijk">Mannelijk</SelectItem>
                    <SelectItem value="Vrouwelijk">Vrouwelijk</SelectItem>
                    <SelectItem value="Onbekend">Onbekend</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Ras">
              {breedList.length > 0 ? (
                <Select value={form.breed || undefined} onValueChange={(v) => setForm({ ...form, breed: v })}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Kies ras" /></SelectTrigger>
                  <SelectContent>
                    {breedList.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} className="rounded-xl h-12" placeholder="Kies eerst een soort" />
              )}
            </Field>
            <Field label="Geboortedatum" hint={age ? `Leeftijd: ${age}` : undefined}>
              <Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="rounded-xl h-12" />
            </Field>
          </Card>

          <Card title="Fysieke gegevens" eyebrow="02">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Gewicht (kg)"><Input type="number" step="0.01" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="rounded-xl h-12" placeholder="0,0" /></Field>
              <Field label="Kleur"><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="rounded-xl h-12" placeholder="Bijv. zwart" /></Field>
            </div>
            <Field label="Chipnummer"><Input value={form.microchip_number} onChange={(e) => setForm({ ...form, microchip_number: e.target.value })} className="rounded-xl h-12" /></Field>
            <Field label="Paspoortnummer"><Input value={form.passport_number} onChange={(e) => setForm({ ...form, passport_number: e.target.value })} className="rounded-xl h-12" /></Field>
            <ToggleRow id="neutered" label="Gecastreerd / Gesteriliseerd" checked={!!form.is_neutered} onCheckedChange={(c) => setForm({ ...form, is_neutered: c })} />
          </Card>

          <Card title="Gezondheid" eyebrow="03">
            <Field label="Vaste dierenarts"><Input value={form.vet_name} onChange={(e) => setForm({ ...form, vet_name: e.target.value })} className="rounded-xl h-12" placeholder="Praktijknaam" /></Field>
            <Field label="Allergieën"><Textarea value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} className="rounded-xl min-h-[72px]" placeholder="Bijv. kip, gluten" /></Field>
            <Field label="Chronische aandoeningen"><Textarea value={form.chronic_conditions} onChange={(e) => setForm({ ...form, chronic_conditions: e.target.value })} className="rounded-xl min-h-[72px]" /></Field>
            <ToggleRow id="insured" label="Verzekerd" checked={!!form.is_insured} onCheckedChange={(c) => setForm({ ...form, is_insured: c })} />
          </Card>

          <Card title="Extra informatie" eyebrow="04">
            <Field label="Notities"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl min-h-[96px]" placeholder="Bijzonderheden, karakter…" /></Field>
          </Card>
        </form>

        {/* Sticky save bar */}
        <div className="shrink-0 px-5 pt-3 pb-5 border-t border-border bg-card/95 backdrop-blur-sm">
          <Button
            type="submit"
            form="pet-form"
            disabled={mut.isPending}
            className="w-full h-12 rounded-full text-[15px]"
          >
            {mut.isPending ? "Opslaan…" : initial?.id ? "Wijzigingen opslaan" : "Huisdier opslaan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-primary font-medium">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/* ---------- Generic sub-record form (medications, vaccinations, etc.) ---------- */

type OptList = string[] | { value: string; label: string }[];

export type SubFieldDef =
  | { key: string; label: string; type: "text" | "date" | "time" | "number" | "textarea" }
  | { key: string; label: string; type: "select"; options: OptList }
  | { key: string; label: string; type: "select-other"; options: OptList; otherKey: string; otherLabel: string; otherPlaceholder?: string }
  | { key: string; label: string; type: "checkbox" }
  | { key: string; label: string; type: "file"; bucket: "pet-photos" | "pet-documents"; accept?: string };

function normalizeOptions(options: OptList): { value: string; label: string }[] {
  return options.map((o: any) => (typeof o === "string" ? { value: o, label: o } : o));
}

export function SubRecordDialog({
  trigger, table, petId, title, fields, initial, onSaved, pets,
}: {
  trigger: ReactNode;
  table: "medications" | "vaccinations" | "appointments" | "weight_entries" | "reminders" | "expenses" | "documents";
  petId?: string | null;
  title: string;
  fields: SubFieldDef[];
  initial?: any;
  onSaved?: () => void;
  pets?: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const [selectedPet, setSelectedPet] = useState<string>(initial?.pet_id ?? petId ?? "");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [values, setValues] = useState<Record<string, any>>(() => {
    const v: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.type === "checkbox") v[f.key] = !!initial?.[f.key];
      else v[f.key] = initial?.[f.key] ?? "";
      if (f.type === "select-other") v[f.otherKey] = initial?.[f.otherKey] ?? "";
    });
    return v;
  });

  const mut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const payload: any = { user_id: uid };
      const chosenPet = selectedPet || petId || null;
      if (pets && !chosenPet) throw new Error("Please choose a pet");
      if (chosenPet) payload.pet_id = chosenPet;
      for (const f of fields) {
        const v = values[f.key];
        if (f.type === "checkbox") {
          payload[f.key] = !!v;
        } else if (f.type === "file") {
          const file = files[f.key];
          if (file) {
            const path = `${uid}/${crypto.randomUUID()}-${file.name}`;
            const up = await supabase.storage.from(f.bucket).upload(path, file);
            if (up.error) throw up.error;
            payload[f.key] = path;
          } else if (initial?.[f.key]) {
            payload[f.key] = initial[f.key];
          } else {
            payload[f.key] = null;
          }
        } else if (f.type === "select-other") {
          const custom = values[f.otherKey];
          if (v === "Other" && (!custom || !String(custom).trim())) {
            throw new Error(`Please enter ${f.otherLabel}`);
          }
          // Store the custom text into the primary column when "Other" is
          // chosen — avoids needing an extra custom_* column per table.
          payload[f.key] = v === "Other" ? String(custom).trim() : (v || null);
        } else if (v === "" || v === undefined || v === null) {
          payload[f.key] = null;
        } else if (f.type === "number") {
          payload[f.key] = Number(v);
        } else {
          payload[f.key] = v;
        }
      }
      if (initial?.id) {
        const { error } = await supabase.from(table).update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(initial?.id ? "Bijgewerkt" : "Toegevoegd");
      setOpen(false);
      onSaved?.();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const noPets = !!pets && pets.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md max-h-[92dvh] rounded-3xl flex flex-col gap-4 p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
          <DialogDescription className="sr-only">Vul de gegevens in en druk op Opslaan.</DialogDescription>
        </DialogHeader>
        {noPets ? (
          <p className="text-sm text-muted-foreground py-4">Voeg eerst een huisdier toe om verder te gaan.</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3 flex-1 overflow-y-auto pr-1 -mr-1">
            {pets && pets.length > 0 && (
              <Field label="Huisdier">
                <Select value={selectedPet || undefined} onValueChange={setSelectedPet}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Kies een huisdier" /></SelectTrigger>
                  <SelectContent>
                    {pets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
            {fields.map((f) => (
              <Field key={f.key} label={f.label}>
                {f.type === "textarea" ? (
                  <Textarea value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className="rounded-xl" />
                ) : f.type === "checkbox" ? (
                  <div className="flex items-center h-11">
                    <Checkbox checked={!!values[f.key]} onCheckedChange={(c) => setValues({ ...values, [f.key]: !!c })} />
                    <span className="ml-2 text-sm text-muted-foreground">Ja</span>
                  </div>
                ) : f.type === "file" ? (
                  <>
                    <Input type="file" accept={f.accept} onChange={(e) => setFiles({ ...files, [f.key]: e.target.files?.[0] ?? null })} className="rounded-xl h-11" />
                    {initial?.[f.key] && !files[f.key] && (
                      <div className="text-[11px] text-muted-foreground mt-1 truncate">Huidig: {String(initial[f.key]).split("/").pop()}</div>
                    )}
                  </>
                ) : f.type === "select" ? (
                  <Select value={values[f.key] || undefined} onValueChange={(v) => setValues({ ...values, [f.key]: v })}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Kies" /></SelectTrigger>
                    <SelectContent>
                      {normalizeOptions(f.options).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : f.type === "select-other" ? (
                  <div className="space-y-2">
                    <Select value={values[f.key] || undefined} onValueChange={(v) => setValues({ ...values, [f.key]: v })}>
                      <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Kies" /></SelectTrigger>
                      <SelectContent>
                        {normalizeOptions(f.options).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {values[f.key] === "Other" && (
                      <Input
                        value={values[f.otherKey] ?? ""}
                        onChange={(e) => setValues({ ...values, [f.otherKey]: e.target.value })}
                        placeholder={f.otherPlaceholder ?? f.otherLabel}
                        className="rounded-xl h-11"
                      />
                    )}
                  </div>
                ) : (
                  <Input
                    type={f.type}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    className="rounded-xl h-11"
                    step={f.type === "number" ? "0.01" : undefined}
                  />
                )}
              </Field>
            ))}
            <DialogFooter>
              <Button type="submit" disabled={mut.isPending} className="w-full h-12 rounded-full">
                {mut.isPending ? "Opslaan…" : "Opslaan"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Shared field option lists ---------- */

export const MEDICATION_FREQUENCIES: OptList = [
  { value: "Once daily", label: "1x per dag" },
  { value: "Twice daily", label: "2x per dag" },
  { value: "Three times daily", label: "3x per dag" },
  { value: "Every other day", label: "Om de dag" },
  { value: "Weekly", label: "Wekelijks" },
  { value: "Monthly", label: "Maandelijks" },
  { value: "As needed", label: "Indien nodig" },
  { value: "Other", label: "Anders" },
];

export const VACCINE_TYPES: OptList = [
  { value: "Rabies", label: "Rabiës" },
  { value: "Kennel Cough", label: "Kennelhoest" },
  { value: "DHPP", label: "DHPP (Hond)" },
  { value: "Leptospirosis", label: "Leptospirose" },
  { value: "Lyme Disease", label: "Ziekte van Lyme" },
  { value: "Feline Leukemia", label: "FeLV (Kat)" },
  { value: "FVRCP", label: "FVRCP (Kat)" },
  { value: "Other", label: "Anders" },
];

export const DOCUMENT_TYPES: OptList = [
  { value: "Vaccination Certificate", label: "Vaccinatiebewijs" },
  { value: "Insurance Document", label: "Verzekeringsdocument" },
  { value: "Veterinary Report", label: "Dierenartsverslag" },
  { value: "Invoice", label: "Factuur" },
  { value: "Passport", label: "Paspoort" },
  { value: "Medication Prescription", label: "Recept" },
  { value: "Lab Result", label: "Laboratoriumuitslag" },
  { value: "Other", label: "Anders" },
];

export const EXPENSE_CATEGORIES: OptList = [
  { value: "Veterinarian", label: "Dierenarts" },
  { value: "Medication", label: "Medicatie" },
  { value: "Vaccination", label: "Vaccinatie" },
  { value: "Grooming", label: "Trimmen" },
  { value: "Food", label: "Voeding" },
  { value: "Flea and Tick", label: "Vlooien & Teken" },
  { value: "Deworming", label: "Ontwormen" },
  { value: "Insurance", label: "Verzekering" },
  { value: "Toys", label: "Speelgoed" },
  { value: "Accessories", label: "Accessoires" },
  { value: "Travel", label: "Reizen" },
  { value: "Other", label: "Anders" },
];

/* Field definitions for each record type */

export const medicationFields: SubFieldDef[] = [
  { key: "name", label: "Naam medicijn", type: "text" },
  { key: "dosage", label: "Dosering", type: "text" },
  {
    key: "frequency", label: "Frequentie", type: "select-other",
    options: MEDICATION_FREQUENCIES, otherKey: "custom_frequency", otherLabel: "Eigen frequentie",
    otherPlaceholder: "Bijv. elke 6 uur",
  },
  { key: "start_date", label: "Startdatum", type: "date" },
  { key: "end_date", label: "Einddatum", type: "date" },
  { key: "notes", label: "Notities", type: "textarea" },
];

export const vaccinationFields: SubFieldDef[] = [
  {
    key: "vaccine", label: "Type vaccinatie", type: "select-other",
    options: VACCINE_TYPES, otherKey: "custom_vaccine", otherLabel: "Eigen vaccinatienaam",
    otherPlaceholder: "Naam vaccinatie",
  },
  { key: "date_given", label: "Toedieningsdatum", type: "date" },
  { key: "next_due_date", label: "Volgende afspraak", type: "date" },
  { key: "notes", label: "Notities", type: "textarea" },
];

export const documentFields: SubFieldDef[] = [
  {
    key: "type", label: "Type document", type: "select-other",
    options: DOCUMENT_TYPES, otherKey: "custom_type", otherLabel: "Eigen type document",
    otherPlaceholder: "Soort document",
  },
  { key: "title", label: "Titel document", type: "text" },
  { key: "file_path", label: "Bestand uploaden", type: "file", bucket: "pet-documents" },
  { key: "date", label: "Datum", type: "date" },
  { key: "notes", label: "Notities", type: "textarea" },
];

export const expenseFields: SubFieldDef[] = [
  { key: "date", label: "Datum", type: "date" },
  {
    key: "category", label: "Categorie", type: "select-other",
    options: EXPENSE_CATEGORIES, otherKey: "custom_category", otherLabel: "Eigen categorie",
    otherPlaceholder: "Naam categorie",
  },
  { key: "title", label: "Omschrijving", type: "text" },
  { key: "amount", label: "Bedrag (€)", type: "number" },
  { key: "currency", label: "Valuta", type: "select", options: ["EUR", "USD", "GBP"] },
  { key: "paid", label: "Betaald", type: "checkbox" },
  { key: "invoice_path", label: "Factuur uploaden", type: "file", bucket: "pet-documents" },
  { key: "notes", label: "Notities", type: "textarea" },
];
