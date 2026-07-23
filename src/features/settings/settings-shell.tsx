import {
  Ban,
  Bell,
  Cloud,
  Download,
  KeyRound,
  Palette,
  Shield,
  UserRound,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ImplementedSection =
  | "overview"
  | "profile"
  | "storage"
  | "notifications"
  | "appearance"
  | "privacy"
  | "account"
  | "blocked"
  | "export";

const implementedSections: Array<{
  id: ImplementedSection;
  title: string;
  description: string;
  to: string;
  icon: typeof UserRound;
}> = [
  {
    id: "overview",
    title: "Overview",
    description: "Account, storage, and surface health.",
    to: "/settings",
    icon: UserRound,
  },
  {
    id: "profile",
    title: "Profile",
    description: "Public identity and outbound links.",
    to: "/settings/profile",
    icon: UserRound,
  },
  {
    id: "storage",
    title: "Storage",
    description: "Cloud providers, folders, and access.",
    to: "/settings/storage",
    icon: Cloud,
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "In-app rules, browser push, and delivery.",
    to: "/settings/notifications",
    icon: Bell,
  },
  {
    id: "appearance",
    title: "Appearance",
    description: "Theme, density, and playback chrome.",
    to: "/settings/appearance",
    icon: Palette,
  },
  {
    id: "privacy",
    title: "Privacy",
    description: "Blocking, safety, and account boundaries.",
    to: "/settings/privacy",
    icon: Shield,
  },
  {
    id: "account",
    title: "Account",
    description: "Credentials, sessions, and account lifecycle.",
    to: "/settings/account",
    icon: KeyRound,
  },
  {
    id: "blocked",
    title: "Blocked accounts",
    description: "Review and recover blocked relationships.",
    to: "/settings/blocked",
    icon: Ban,
  },
  {
    id: "export",
    title: "Data export",
    description: "Request a portable account archive.",
    to: "/settings/account/export",
    icon: Download,
  },
];

export function SettingsSidebar({
  driveReady,
}: {
  driveReady: boolean;
}) {
  const location = useLocation();

  return (
    <Card className="space-y-6 p-4 md:p-5">
      <div className="space-y-2 px-1">
        <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/80">Settings map</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Shape your public identity, studio environment, storage, and personal boundaries.
        </p>
      </div>

      <div className="space-y-2">
        {implementedSections.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.id === "overview"
              ? location.pathname === "/settings"
              : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
          return (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.id === "overview"}
              className={() =>
                cn(
                  "flex items-start gap-3 rounded-[22px] border px-4 py-3.5 transition-[background-color,border-color,color]",
                  isActive
                    ? "border-accent/30 bg-accent/12 text-foreground"
                    : "border-transparent text-muted-foreground hover:border-white/8 hover:bg-white/[0.03] hover:text-foreground",
                )
              }
            >
              <div className="mt-0.5 flex size-9 items-center justify-center rounded-2xl bg-white/[0.04] text-accent-secondary">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.title}</p>
                  {item.id === "storage" ? (
                    <Badge variant={driveReady ? "success" : "warning"}>{driveReady ? "Ready" : "Setup"}</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            </NavLink>
          );
        })}
      </div>

      <div className="space-y-3 rounded-[28px] border border-accent/18 bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.22),rgba(255,255,255,0.02)_62%,rgba(255,255,255,0.01))] p-5">
        <p className="font-display text-2xl tracking-[-0.03em]">Drive your music.</p>
        <p className="text-sm leading-7 text-muted-foreground">
          Keep originals private, control what becomes playable, and route future uploads into the same folder system.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/create/single">
            <Button variant="primary" size="sm">New single</Button>
          </Link>
          <Link to="/create/ep">
            <Button variant="secondary" size="sm">New EP</Button>
          </Link>
          <Link to="/create/album">
            <Button variant="secondary" size="sm">New album</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
