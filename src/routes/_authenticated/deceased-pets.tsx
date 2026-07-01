import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, PawPrint, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/deceased-pets")({
  head: () => ({ meta: [{ title: "Overleden huisdieren — PetKeeper" }] }),
  component: DeceasedPetsPage,
});

function DeceasedPetsPage() {
  const { data } = useQuery({
    queryKey: ["pets", "deceased-only"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("status", "deceased")
        .order("deceased_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const items = data ?? [];

  return (
    <>
      <Link to="/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Instellingen
      </Link>
      <h1 className="text-3xl font-display font-medium mb-6">Overleden huisdieren</h1>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3 text-muted-foreground">
          <Heart className="w-4 h-4" strokeWidth={1.75} />
          <span className="text-xs uppercase tracking-wider">In herinnering</span>
        </div>
        {items.length === 0 ? (
          <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] py-8 text-center text-sm text-muted-foreground">
            Geen huisdieren in herinnering
          </div>
        ) : (
          <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-soft)] divide-y divide-border overflow-hidden">
            {items.map((p: any) => (
              <Link key={p.id} to="/pets/$id" params={{ id: p.id }} className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/40 transition">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name} className="w-12 h-12 rounded-2xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--gradient-surface)" }}>
                    <PawPrint className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {p.deceased_date ? `Overleden op ${p.deceased_date}` : [p.breed, p.species].filter(Boolean).join(" • ") || "—"}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">Bekijk</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}