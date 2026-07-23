import { NavLink, Outlet, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  CircleDot,
  Compass,
  FolderKanban,
  House,
  MessageCircleMore,
  Plus,
  Settings,
  UsersRound,
  WifiOff,
} from "lucide-react";

import { usePlayerStore } from "@/components/audio/player-store";
import { MxShareMark } from "@/components/layout/mxshare-mark";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getAssetById } from "@/features/drive/api";
import { getUnreadConversationSummary } from "@/features/messages/api";
import { getUnreadNotificationCount } from "@/features/notifications/api";
import { useNotificationsRealtime } from "@/features/notifications/use-notifications-realtime";
import { getCurrentProfile } from "@/features/profile/api";
import { useAuth } from "@/hooks/use-auth";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { getAvatarAssetUrls } from "@/lib/asset-urls";
import { env, envState } from "@/lib/env";
import { cn } from "@/lib/utils";

const navigation = [
  { to: "/", label: "Home", icon: House },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/library", label: "Library", icon: FolderKanban },
  { to: "/projects", label: "Projects", icon: UsersRound },
  { to: "/messages", label: "Messages", icon: MessageCircleMore },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
];

function formatBadgeCount(value: number) {
  return value > 99 ? "99+" : String(value);
}

export function AppShell() {
  const { user, signOut } = useAuth();
  const viewer = useAppViewer();
  const isOnline = useOnlineStatus();
  const activeTrackId = usePlayerStore((state) => state.activeTrackId);
  useNotificationsRealtime(viewer.userId);

  const profileQuery = useQuery({
    queryKey: ["profile", viewer.userId],
    queryFn: () => getCurrentProfile(viewer.userId),
    enabled: Boolean(viewer.userId),
  });

  const avatarAssetQuery = useQuery({
    queryKey: ["asset", profileQuery.data?.avatar_asset_id],
    queryFn: () => getAssetById(profileQuery.data!.avatar_asset_id!),
    enabled: Boolean(profileQuery.data?.avatar_asset_id),
  });
  const unreadNotificationsQuery = useQuery({
    queryKey: ["notifications-unread", viewer.userId],
    queryFn: () => getUnreadNotificationCount(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });
  const unreadMessagesQuery = useQuery({
    queryKey: ["messages-unread", viewer.userId],
    queryFn: () => getUnreadConversationSummary(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });

  const currentProfile = profileQuery.data ?? null;
  const avatarUrl = getAvatarAssetUrls(avatarAssetQuery.data);
  const hasActivePlayerTrack = Boolean(activeTrackId);
  const publicProfilePath = currentProfile?.username ? `/@${currentProfile.username}` : null;
  const unreadNavigationCounts = new Map<string, number>([
    ["/messages", unreadMessagesQuery.data?.unreadConversations ?? 0],
    ["/notifications", unreadNotificationsQuery.data ?? 0],
  ]);

  return (
    <div
      className={cn(
        "page-shell min-h-screen",
        hasActivePlayerTrack ? "pb-60 md:pb-56 xl:pb-32" : "pb-28 md:pb-32",
      )}
    >
      {!isOnline ? (
        <div
          role="status"
          className="fixed left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-warning/30 bg-[rgba(20,15,29,0.96)] px-4 py-2 text-xs font-medium text-warning shadow-[0_16px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl"
        >
          <WifiOff className="size-3.5" />
          Offline. Saved pages remain available; sends and uploads wait for a connection.
        </div>
      ) : null}
      <div className="mx-auto grid min-h-screen max-w-[1720px] gap-8 px-4 py-4 md:px-6 xl:grid-cols-[292px_minmax(0,1fr)] xl:py-6">
        <aside className="glass-panel hidden min-h-[calc(100vh-3rem)] rounded-[34px] border border-border px-5 py-6 xl:flex xl:flex-col">
          <div className="flex items-start gap-4 pb-7">
            <MxShareMark className="size-15 shadow-[0_18px_46px_rgba(var(--accent-rgb),0.34)]" />
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/18 bg-accent/10 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.28em] text-accent-secondary/82">
                <CircleDot className="size-3 fill-current stroke-none" />
                 V{env.appVersion}
              </div>
              <p className="font-body text-[2rem] font-semibold tracking-[-0.04em]">MxShare</p>
              <p className="max-w-[11rem] text-sm leading-6 text-muted-foreground">
                Share music. Share versions.
              </p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              const badgeCount = unreadNavigationCounts.get(item.to) ?? 0;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-[20px] border px-4 py-3.5 text-sm transition-[background-color,border-color,color,box-shadow]",
                      isActive
                        ? "border-accent/24 bg-[linear-gradient(90deg,rgba(var(--accent-rgb),0.34),rgba(var(--accent-rgb),0.13)_58%,rgba(255,255,255,0.01))] text-foreground shadow-[0_18px_40px_rgba(15,6,34,0.32)]"
                        : "border-transparent text-muted-foreground hover:border-white/6 hover:bg-white/[0.03] hover:text-foreground",
                    )
                  }
                >
                  <Icon className="size-4 text-accent-secondary/90 transition-transform group-hover:scale-105" />
                  <span>{item.label}</span>
                  {badgeCount > 0 ? (
                    <span className="ml-auto rounded-full border border-accent/18 bg-accent/14 px-2 py-0.5 text-[11px] font-medium text-accent-secondary">
                      {formatBadgeCount(badgeCount)}
                    </span>
                  ) : null}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-7">
            <NavLink to="/create">
              <Button
                fullWidth
                size="lg"
                className="min-h-14 rounded-[22px] text-base shadow-[0_18px_44px_rgba(var(--accent-rgb),0.34)]"
              >
                <Plus className="size-4" />
                Create
              </Button>
            </NavLink>
          </div>

          <div className="mt-7 rounded-[30px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Google Drive</p>
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.24em]",
                  envState.hasGoogleDrive
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                    : "border-white/10 bg-white/5 text-muted-foreground",
                )}
              >
                <CircleDot className="size-3 fill-current stroke-none" />
                {envState.hasGoogleDrive ? "Connected" : "Setup"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {envState.hasGoogleDrive
                ? "Connected once, then future audio, artwork, and avatars flow into the MxShare folder structure."
                : "Connect your Drive once in Settings and keep every upload routed into your private MxShare structure."}
            </p>
            <div className="mt-5">
              <Link to="/settings/storage">
                <Button variant="secondary" size="sm" fullWidth className="justify-between">
                  {envState.hasGoogleDrive ? "Open Drive setup" : "Connect Google Drive"}
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-auto rounded-[30px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-4">
            <div className="flex flex-col gap-4">
              {publicProfilePath ? (
                <Link
                  to={publicProfilePath}
                  className="flex min-w-0 items-center gap-3 rounded-[24px] border border-transparent px-2 py-2 transition-colors hover:border-white/8 hover:bg-white/[0.03]"
                >
                  <Avatar
                    alt={currentProfile?.display_name ?? user?.email ?? "Current user"}
                    src={avatarUrl}
                    initials={(currentProfile?.display_name ?? user?.email ?? "MX")
                      .slice(0, 2)
                      .toUpperCase()}
                    className="size-12"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {currentProfile?.display_name ?? user?.email ?? viewer.email ?? "Guest"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {currentProfile
                        ? `@${currentProfile.username}`
                        : envState.hasSupabase
                          ? "Authenticated shell"
                          : "Setup pending"}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="flex min-w-0 items-center gap-3 px-2 py-2">
                  <Avatar
                    alt={currentProfile?.display_name ?? user?.email ?? "Current user"}
                    src={avatarUrl}
                    initials={(currentProfile?.display_name ?? user?.email ?? "MX")
                      .slice(0, 2)
                      .toUpperCase()}
                    className="size-12"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {currentProfile?.display_name ?? user?.email ?? viewer.email ?? "Guest"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {envState.hasSupabase ? "Authenticated shell" : "Setup pending"}
                    </p>
                  </div>
                </div>
              )}
              {user ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-center rounded-[18px] border border-white/6"
                  onClick={() => void signOut()}
                >
                  Logout
                </Button>
              ) : null}
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-col">
          <Outlet />
        </main>
      </div>

      <nav
        className={cn(
          "fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 flex rounded-full border border-border bg-[rgba(9,7,20,0.94)] p-2 shadow-[0_16px_36px_rgba(0,0,0,0.34)] backdrop-blur-md xl:hidden",
        )}
      >
        {navigation.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const badgeCount = unreadNavigationCounts.get(item.to) ?? 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-full px-3 py-2 text-[11px] transition-colors",
                  isActive
                    ? "bg-[linear-gradient(90deg,rgba(var(--accent-rgb),0.9),var(--accent-strong))] text-white"
                    : "text-muted-foreground",
                )
              }
            >
              <Icon className="size-4" />
              <span className="inline-flex items-center gap-1.5">
                {item.label}
                {badgeCount > 0 ? (
                  <span className="rounded-full bg-white/18 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {formatBadgeCount(badgeCount)}
                  </span>
                ) : null}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
