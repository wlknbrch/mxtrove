import { Bell, Cloud, ExternalLink, Palette, Shield, UserRound } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ImplementedSection = "overview" | "profile" | "storage";

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
    title: "Google Drive",
    description: "Storage, folder structure, and access.",
    to: "/settings/storage",
    icon: Cloud,
  },
];

const upcomingSections: Array<{
  title: string;
  description: string;
  icon: typeof Bell;
}> = [
  {
    title: "Notifications",
    description: "Delivery rules and message alerts.",
    icon: Bell,
  },
  {
    title: "Appearance",
    description: "Theme, density, and playback chrome.",
    icon: Palette,
  },
  {
    title: "Privacy",
    description: "Blocking, safety, and account boundaries.",
    icon: Shield,
  },
];

export function SettingsSidebar({
  driveReady,
  publicProfilePath,
}: {
  driveReady: boolean;
  publicProfilePath?: string | null;
}) {
  return (
    <Card className="space-y-6 p-4 md:p-5">
      <div className="space-y-2 px-1">
        <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/80">Settings map</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Build your public identity on one side and keep Drive routing healthy on the other.
        </p>
      </div>

      <div className="space-y-2">
        {implementedSections.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.id === "overview"}
              className={({ isActive }) =>
                cn(
                  "flex items-start gap-3 rounded-[22px] border px-4 py-3.5 transition-[background-color,border-color,color]",
                  isActive
                    ? "border-accent/30 bg-[linear-gradient(90deg,rgba(157,92,255,0.2),rgba(157,92,255,0.06))] text-foreground"
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

      <div className="space-y-2 rounded-[26px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/75">Soon</p>
        {upcomingSections.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="flex items-start gap-3 rounded-[20px] border border-white/[0.05] bg-white/[0.02] px-4 py-3"
            >
              <div className="mt-0.5 flex size-9 items-center justify-center rounded-2xl bg-white/[0.03] text-muted-foreground">
                <Icon className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <Badge variant="neutral">Soon</Badge>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3 rounded-[28px] border border-accent/18 bg-[radial-gradient(circle_at_top,rgba(157,92,255,0.22),rgba(255,255,255,0.02)_62%,rgba(255,255,255,0.01))] p-5">
        <p className="font-display text-2xl tracking-[-0.03em]">Drive your music.</p>
        <p className="text-sm leading-7 text-muted-foreground">
          Keep originals private, control what becomes playable, and route future uploads into the same folder system.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/create/single">
            <Button variant="primary" size="sm">New single</Button>
          </Link>
          <Link to="/settings/storage">
            <Button variant="secondary" size="sm">Manage storage</Button>
          </Link>
        </div>
        {publicProfilePath ? (
          <Link
            to={publicProfilePath}
            className="inline-flex items-center gap-2 text-sm text-accent-secondary transition-colors hover:text-white"
          >
            View public profile
            <ExternalLink className="size-4" />
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
