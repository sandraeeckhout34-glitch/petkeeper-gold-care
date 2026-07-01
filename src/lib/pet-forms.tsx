import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export type SubFieldDef =
  | { key: string; label: string; type: "text" | "date" | "time" | "number" | "textarea" }
  | { key: string; label: string; type: "select"; options: string[] };

export function SubRecordDialog({
  trigger, table, petId, title, fields, initial, onSaved,
}: {
  trigger: ReactNode;
  table: "medications" | "vaccinations" | "appointments" | "weight_entries" | "reminders";
  petId?: string | null;
  title: string;
  fields: SubFieldDef[];
  initial?: any;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, any>>(() => {
    const v: Record<string, any> = {};
    fields.forEach((f) => (v[f.key] = initial?.[f.key] ?? ""));
    return v;
  });

  const mut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const payload: any = { user_id: u.user!.id };
      if (petId) payload.pet_id = petId;
      fields.forEach((f) => {
        const v = values[f.key];
        if (v === "" || v === undefined) payload[f.key] = null;
        else if (f.type === "number") payload[f.key] = Number(v);
        else payload[f.key] = v;
      });
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader><DialogTitle className="font-display text-2xl">{title}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {fields.map((f) => (
            <Field key={f.key} label={f.label}>
              {f.type === "textarea" ? (
                <Textarea value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className="rounded-xl" />
              ) : f.type === "select" ? (
                <Select value={values[f.key] || undefined} onValueChange={(v) => setValues({ ...values, [f.key]: v })}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>{f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
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
      </DialogContent>
    </Dialog>
  );
}