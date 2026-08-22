import { Activity, Flag, LayoutDashboard } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

const items = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/reports", label: "Reports", icon: Flag, end: false },
];

export function AdminNavigation() {
  return (
    <div className="flex flex-col gap-3 rounded-[26px] border border-border bg-surface-soft p-2 sm:flex-row sm:items-center sm:justify-between">
      <nav className="flex min-w-0 gap-1 overflow-x-auto" aria-label="Administration">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                "inline-flex shrink-0 items-center gap-2 rounded-[18px] px-4 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-accent/18 text-foreground shadow-[inset_0_0_0_1px_rgba(var(--accent-rgb),0.28)]"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              <Icon className="size-4 text-accent-secondary" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="hidden items-center gap-2 px-3 text-xs uppercase tracking-[0.2em] text-muted-foreground sm:flex">
        <Activity className="size-3.5 text-success" />
        Public surfaces only
      </div>
    </div>
  );
}
