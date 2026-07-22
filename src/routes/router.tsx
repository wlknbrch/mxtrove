import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppShell } from "@/components/layout/app-shell";

import { LoginPage } from "@/features/auth/login-page";
import { ExplorePage } from "@/features/feed/explore-page";
import { HomePage } from "@/features/feed/home-page";
import { ProfileConnectionsPage } from "@/features/follows/profile-connections-page";
import { LibraryPage } from "@/features/library/library-page";
import { ConversationPage } from "@/features/messages/conversation-page";
import { MessagesPage } from "@/features/messages/messages-page";
import { NotificationsPage } from "@/features/notifications/notifications-page";
import { CreateIndexPage } from "@/features/posts/create-index-page";
import { CreateReleasePage } from "@/features/posts/create-release-page";
import { CreateSinglePage } from "@/features/posts/create-single-page";
import { EditReleasePage } from "@/features/posts/edit-release-page";
import { PostDetailPage } from "@/features/posts/post-detail-page";
import { OnboardingPage } from "@/features/profile/onboarding-page";
import { ProfilePage } from "@/features/profile/profile-page";
import { NotificationSettingsPage } from "@/features/settings/notification-settings-page";
import { ProfileSettingsPage } from "@/features/settings/profile-settings-page";
import { SettingsIndexPage } from "@/features/settings/settings-index-page";
import { StorageSettingsPage } from "@/features/settings/storage-settings-page";
import { SongDetailPage } from "@/features/songs/song-detail-page";

import { ProtectedRoute } from "@/routes/protected-route";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/onboarding",
        element: <div className="page-shell mx-auto max-w-4xl px-4 py-8 md:px-6"><OnboardingPage /></div>,
      },
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <HomePage /> },
          { path: "/explore", element: <ExplorePage /> },
          { path: "/library", element: <LibraryPage /> },
          { path: "/library/songs", element: <LibraryPage /> },
          { path: "/library/songs/:songId", element: <SongDetailPage /> },
          { path: "/create", element: <CreateIndexPage /> },
          { path: "/create/single", element: <CreateSinglePage /> },
          { path: "/create/ep", element: <CreateReleasePage kind="ep" /> },
          { path: "/create/album", element: <CreateReleasePage kind="album" /> },
          { path: "/post/:postId", element: <PostDetailPage /> },
          { path: "/post/:postId/edit", element: <EditReleasePage /> },
          { path: "/messages", element: <MessagesPage /> },
          { path: "/messages/:conversationId", element: <ConversationPage /> },
          { path: "/notifications", element: <NotificationsPage /> },
          { path: "/settings", element: <SettingsIndexPage /> },
          { path: "/settings/profile", element: <ProfileSettingsPage /> },
          { path: "/settings/storage", element: <StorageSettingsPage /> },
          { path: "/settings/notifications", element: <NotificationSettingsPage /> },
          { path: "/:username/followers", element: <ProfileConnectionsPage relation="followers" /> },
          { path: "/:username/following", element: <ProfileConnectionsPage relation="following" /> },
          { path: "/:username", element: <ProfilePage /> },
        ],
      },
    ],
  },
]);
