import { Link, useRouterState } from "@tanstack/react-router";
import { Home, PawPrint, Calendar, Wallet, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/pets", label: "Huisdieren", icon: PawPrint },
  { to: "/calendar", label: "Kalender", icon: Calendar },
  { to: "/expenses", label: "Kosten", icon: Wallet },
  { to: "/settings", label: "Instellingen", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md px-4 pb-3">
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-full shadow-[var(--shadow-elevated)] px-2 py-2 flex items-center justify-between">
          {items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-full min-h-11 min-w-14 px-3 py-2 transition-all duration-300 ease-out active:scale-[0.94]",
                  active
                    ? "text-primary-foreground shadow-[var(--shadow-soft)]"
                    : "text-primary/55 hover:text-primary",
                )}
                style={active ? { background: "var(--gradient-champagne)" } : undefined}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.75} />
                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}