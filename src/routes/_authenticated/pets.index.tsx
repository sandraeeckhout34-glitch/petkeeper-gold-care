import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, PawPrint } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { PetFormDialog } from "@/lib/pet-forms";

export const Route = createFileRoute("/_authenticated/pets/")({
  head: () => ({ meta: [{ title: "Pets — PetKeeper" }] }),
  component: PetsPage,
});

function PetsPage() {
  const { data: pets } = useQuery({
    queryKey: ["pets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pets").select("*").eq("status","active").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <>
      <PageHeader
        subtitle="Jouw gezelschap"
        title="Huisdieren"
        action={
          <PetFormDialog trigger={
            <Button size="icon" className="rounded-full w-11 h-11 shadow-[var(--shadow-soft)]">
              <Plus className="w-5 h-5" />
            </Button>
          } />
        }
      />

      {!pets || pets.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] p-10 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--gradient-champagne)" }}>
            <PawPrint className="w-7 h-7 text-primary-foreground" strokeWidth={1.5} />
          </div>
          <h3 className="font-display text-xl mb-2">Nog geen huisdieren</h3>
          <p className="text-sm text-muted-foreground mb-5">Voeg je eerste huisdier toe om PetKeeper volledig te gebruiken.</p>
          <PetFormDialog trigger={<Button className="rounded-full">Huisdier toevoegen</Button>} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {pets.map((p) => (
            <Link key={p.id} to="/pets/$id" params={{ id: p.id }} className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] p-4 hover:shadow-[var(--shadow-elevated)] transition-shadow">
              {p.photo_url ? (
                <img src={p.photo_url} alt={p.name} className="w-full aspect-square object-cover rounded-2xl" />
              ) : (
                <div className="w-full aspect-square rounded-2xl flex items-center justify-center" style={{ background: "var(--gradient-surface)" }}>
                  <PawPrint className="w-10 h-10 text-primary" strokeWidth={1.5} />
                </div>
              )}
              <div className="mt-3">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground truncate">{p.breed || p.species || "—"}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}