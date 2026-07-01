import { type ReactNode } from "react";
import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-md mx-auto px-5 pt-8 pb-32">{children}</main>
      <BottomNav />
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex items-start justify-between mb-6">
      <div>
        {subtitle && <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">{subtitle}</div>}
        <h1 className="text-3xl font-display font-medium text-foreground leading-tight">{title}</h1>
      </div>
      {action}
    </header>
  );
}