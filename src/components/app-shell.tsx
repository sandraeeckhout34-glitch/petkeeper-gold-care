import { type ReactNode } from "react";
import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <main className="max-w-md mx-auto px-5 pt-8 pb-32 animate-fade-up">{children}</main>
      <BottomNav />
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 mb-8">
      <div className="min-w-0">
        {subtitle && (
          <div className="text-[11px] uppercase tracking-[0.22em] text-primary/70 font-medium mb-2">
            {subtitle}
          </div>
        )}
        <h1 className="font-display text-[32px] leading-[1.1] text-foreground truncate">
          {title}
        </h1>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}