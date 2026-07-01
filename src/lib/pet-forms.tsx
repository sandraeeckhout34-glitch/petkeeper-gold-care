import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
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
};

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
      toast.success(initial?.id ? "Pet updated" : "Pet added");
      setOpen(false);
      onSaved?.(id);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{initial?.id ? "Edit pet" : "Add a pet"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <Field label="Photo">
            <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="rounded-xl h-11" />
          </Field>
          <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl h-11" /></Field>
          <Field label="Species">
            <Select value={form.species || undefined} onValueChange={(v) => setForm({ ...form, species: v })}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Dog">Dog</SelectItem>
                <SelectItem value="Cat">Cat</SelectItem>
                <SelectItem value="Rabbit">Rabbit</SelectItem>
                <SelectItem value="Bird">Bird</SelectItem>
                <SelectItem value="Reptile">Reptile</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Breed"><Input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} className="rounded-xl h-11" /></Field>
          <Field label="Gender">
            <Select value={form.gender || undefined} onValueChange={(v) => setForm({ ...form, gender: v })}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Birth date"><Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="rounded-xl h-11" /></Field>
            <Field label="Weight (kg)"><Input type="number" step="0.01" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="rounded-xl h-11" /></Field>
          </div>
          <Field label="Color"><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="rounded-xl h-11" /></Field>
          <Field label="Microchip number"><Input value={form.microchip_number} onChange={(e) => setForm({ ...form, microchip_number: e.target.value })} className="rounded-xl h-11" /></Field>
          <Field label="Passport number"><Input value={form.passport_number} onChange={(e) => setForm({ ...form, passport_number: e.target.value })} className="rounded-xl h-11" /></Field>
          <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl" /></Field>
          <DialogFooter>
            <Button type="submit" disabled={mut.isPending} className="w-full h-12 rounded-full">
              {mut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
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
      toast.success(initial?.id ? "Updated" : "Added");
      setOpen(false);
      onSaved?.();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const noPets = !!pets && pets.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader><DialogTitle className="font-display text-2xl">{title}</DialogTitle></DialogHeader>
        {noPets ? (
          <p className="text-sm text-muted-foreground py-4">Add a pet first to continue.</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {pets && pets.length > 0 && (
              <Field label="Pet">
                <Select value={selectedPet || undefined} onValueChange={setSelectedPet}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Choose a pet" /></SelectTrigger>
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
                    <span className="ml-2 text-sm text-muted-foreground">Yes</span>
                  </div>
                ) : f.type === "file" ? (
                  <>
                    <Input type="file" accept={f.accept} onChange={(e) => setFiles({ ...files, [f.key]: e.target.files?.[0] ?? null })} className="rounded-xl h-11" />
                    {initial?.[f.key] && !files[f.key] && (
                      <div className="text-[11px] text-muted-foreground mt-1 truncate">Current: {String(initial[f.key]).split("/").pop()}</div>
                    )}
                  </>
                ) : f.type === "select" ? (
                  <Select value={values[f.key] || undefined} onValueChange={(v) => setValues({ ...values, [f.key]: v })}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Choose" /></SelectTrigger>
                    <SelectContent>
                      {normalizeOptions(f.options).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : f.type === "select-other" ? (
                  <div className="space-y-2">
                    <Select value={values[f.key] || undefined} onValueChange={(v) => setValues({ ...values, [f.key]: v })}>
                      <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Choose" /></SelectTrigger>
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
                {mut.isPending ? "Saving…" : "Save"}
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
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Every other day",
  "Weekly",
  "Monthly",
  "As needed",
  "Other",
];

export const VACCINE_TYPES: OptList = [
  "Rabies",
  "Kennel Cough",
  "DHPP",
  "Leptospirosis",
  "Lyme Disease",
  "Feline Leukemia",
  "FVRCP",
  "Other",
];

export const DOCUMENT_TYPES: OptList = [
  "Vaccination Certificate",
  "Insurance Document",
  "Veterinary Report",
  "Invoice",
  "Passport",
  "Medication Prescription",
  "Lab Result",
  "Other",
];

export const EXPENSE_CATEGORIES: OptList = [
  "Veterinarian",
  "Medication",
  "Vaccination",
  "Grooming",
  "Food",
  "Flea and Tick",
  "Deworming",
  "Insurance",
  "Toys",
  "Accessories",
  "Travel",
  "Other",
];

/* Field definitions for each record type */

export const medicationFields: SubFieldDef[] = [
  { key: "name", label: "Medication Name", type: "text" },
  { key: "dosage", label: "Dosage", type: "text" },
  {
    key: "frequency", label: "Frequency", type: "select-other",
    options: MEDICATION_FREQUENCIES, otherKey: "custom_frequency", otherLabel: "Custom Frequency",
    otherPlaceholder: "e.g. Every 6 hours",
  },
  { key: "start_date", label: "Start Date", type: "date" },
  { key: "end_date", label: "End Date", type: "date" },
  { key: "notes", label: "Notes", type: "textarea" },
];

export const vaccinationFields: SubFieldDef[] = [
  {
    key: "vaccine", label: "Vaccine Type", type: "select-other",
    options: VACCINE_TYPES, otherKey: "custom_vaccine", otherLabel: "Custom Vaccine Name",
    otherPlaceholder: "Vaccine name",
  },
  { key: "date_given", label: "Date Given", type: "date" },
  { key: "next_due_date", label: "Next Due Date", type: "date" },
  { key: "notes", label: "Notes", type: "textarea" },
];

export const documentFields: SubFieldDef[] = [
  {
    key: "type", label: "Document Type", type: "select-other",
    options: DOCUMENT_TYPES, otherKey: "custom_type", otherLabel: "Custom Document Type",
    otherPlaceholder: "Type of document",
  },
  { key: "title", label: "Document Title", type: "text" },
  { key: "file_path", label: "Upload File", type: "file", bucket: "pet-documents" },
  { key: "date", label: "Date", type: "date" },
  { key: "notes", label: "Notes", type: "textarea" },
];

export const expenseFields: SubFieldDef[] = [
  { key: "date", label: "Date", type: "date" },
  {
    key: "category", label: "Category", type: "select-other",
    options: EXPENSE_CATEGORIES, otherKey: "custom_category", otherLabel: "Custom Category",
    otherPlaceholder: "Category name",
  },
  { key: "title", label: "Description", type: "text" },
  { key: "amount", label: "Amount", type: "number" },
  { key: "currency", label: "Currency", type: "select", options: ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"] },
  { key: "paid", label: "Paid", type: "checkbox" },
  { key: "invoice_path", label: "Invoice Upload", type: "file", bucket: "pet-documents" },
  { key: "notes", label: "Notes", type: "textarea" },
];
