import { Suspense, lazy, type ReactElement } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppShell } from "@/components/layout/app-shell";

import { ProtectedRoute } from "@/routes/protected-route";

const LoginPage = lazy(async () => {
  const module = await import("@/features/auth/login-page");
  return { default: module.LoginPage };
});
const ExplorePage = lazy(async () => {
  const module = await import("@/features/feed/explore-page");
  return { default: module.ExplorePage };
});
const HomePage = lazy(async () => {
  const module = await import("@/features/feed/home-page");
  return { default: module.HomePage };
});
const ProfileConnectionsPage = lazy(async () => {
  const module = await import("@/features/follows/profile-connections-page");
  return { default: module.ProfileConnectionsPage };
});
const LibraryPage = lazy(async () => {
  const module = await import("@/features/library/library-page");
  return { default: module.LibraryPage };
});
const ConversationPage = lazy(async () => {
  const module = await import("@/features/messages/conversation-page");
  return { default: module.ConversationPage };
});
const MessagesPage = lazy(async () => {
  const module = await import("@/features/messages/messages-page");
  return { default: module.MessagesPage };
});
const NotificationsPage = lazy(async () => {
  const module = await import("@/features/notifications/notifications-page");
  return { default: module.NotificationsPage };
});
const CreateIndexPage = lazy(async () => {
  const module = await import("@/features/posts/create-index-page");
  return { default: module.CreateIndexPage };
});
const CreateReleasePage = lazy(async () => {
  const module = await import("@/features/posts/create-release-page");
  return { default: module.CreateReleasePage };
});
const CreateSinglePage = lazy(async () => {
  const module = await import("@/features/posts/create-single-page");
  return { default: module.CreateSinglePage };
});
const EditReleasePage = lazy(async () => {
  const module = await import("@/features/posts/edit-release-page");
  return { default: module.EditReleasePage };
});
const PostDetailPage = lazy(async () => {
  const module = await import("@/features/posts/post-detail-page");
  return { default: module.PostDetailPage };
});
const OnboardingPage = lazy(async () => {
  const module = await import("@/features/profile/onboarding-page");
  return { default: module.OnboardingPage };
});
const ProfilePage = lazy(async () => {
  const module = await import("@/features/profile/profile-page");
  return { default: module.ProfilePage };
});
const NotificationSettingsPage = lazy(async () => {
  const module = await import("@/features/settings/notification-settings-page");
  return { default: module.NotificationSettingsPage };
});
const ProfileSettingsPage = lazy(async () => {
  const module = await import("@/features/settings/profile-settings-page");
  return { default: module.ProfileSettingsPage };
});
const SettingsIndexPage = lazy(async () => {
  const module = await import("@/features/settings/settings-index-page");
  return { default: module.SettingsIndexPage };
});
const StorageSettingsPage = lazy(async () => {
  const module = await import("@/features/settings/storage-settings-page");
  return { default: module.StorageSettingsPage };
});
const SongDetailPage = lazy(async () => {
  const module = await import("@/features/songs/song-detail-page");
  return { default: module.SongDetailPage };
});

function RouteFallback() {
  return (
    <div className="page-shell flex min-h-[40vh] items-center justify-center px-4 py-16">
      <div className="glass-panel rounded-[28px] border border-border px-6 py-5 text-center">
        <p className="text-sm font-medium text-foreground">Loading the next screen…</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pulling in the lighter route bundle for this part of MxShare.
        </p>
      </div>
    </div>
  );
}

function routeElement(element: ReactElement) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: routeElement(<LoginPage />),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/onboarding",
        element: routeElement(
          <div className="page-shell mx-auto max-w-4xl px-4 py-8 md:px-6">
            <OnboardingPage />
          </div>,
        ),
      },
      {
        element: <AppShell />,
        children: [
          { path: "/", element: routeElement(<HomePage />) },
          { path: "/explore", element: routeElement(<ExplorePage />) },
          { path: "/library", element: routeElement(<LibraryPage />) },
          { path: "/library/songs", element: routeElement(<LibraryPage />) },
          { path: "/library/songs/:songId", element: routeElement(<SongDetailPage />) },
          { path: "/create", element: routeElement(<CreateIndexPage />) },
          { path: "/create/single", element: routeElement(<CreateSinglePage />) },
          { path: "/create/ep", element: routeElement(<CreateReleasePage kind="ep" />) },
          { path: "/create/album", element: routeElement(<CreateReleasePage kind="album" />) },
          { path: "/post/:postId", element: routeElement(<PostDetailPage />) },
          { path: "/post/:postId/edit", element: routeElement(<EditReleasePage />) },
          { path: "/messages", element: routeElement(<MessagesPage />) },
          { path: "/messages/:conversationId", element: routeElement(<ConversationPage />) },
          { path: "/notifications", element: routeElement(<NotificationsPage />) },
          { path: "/settings", element: routeElement(<SettingsIndexPage />) },
          { path: "/settings/profile", element: routeElement(<ProfileSettingsPage />) },
          { path: "/settings/storage", element: routeElement(<StorageSettingsPage />) },
          {
            path: "/settings/notifications",
            element: routeElement(<NotificationSettingsPage />),
          },
          {
            path: "/:username/followers",
            element: routeElement(<ProfileConnectionsPage relation="followers" />),
          },
          {
            path: "/:username/following",
            element: routeElement(<ProfileConnectionsPage relation="following" />),
          },
          { path: "/:username", element: routeElement(<ProfilePage />) },
        ],
      },
    ],
  },
]);
