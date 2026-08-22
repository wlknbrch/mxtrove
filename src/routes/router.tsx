import { Suspense, lazy, type ReactElement } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppShell } from "@/components/layout/app-shell";
import { OptionalPublicShell } from "@/components/layout/optional-public-shell";
import { RootLayout } from "@/components/layout/root-layout";

import { ProtectedRoute } from "@/routes/protected-route";

const LoginPage = lazy(async () => {
  const module = await import("@/features/auth/login-page");
  return { default: module.LoginPage };
});
const ForgotPasswordPage = lazy(async () => {
  const module = await import("@/features/auth/password-recovery-pages");
  return { default: module.ForgotPasswordPage };
});
const ResetPasswordPage = lazy(async () => {
  const module = await import("@/features/auth/password-recovery-pages");
  return { default: module.ResetPasswordPage };
});
const AboutPage = lazy(async () => {
  const module = await import("@/features/legal/legal-pages");
  return { default: module.AboutPage };
});
const PrivacyPolicyPage = lazy(async () => {
  const module = await import("@/features/legal/legal-pages");
  return { default: module.PrivacyPolicyPage };
});
const TermsOfServicePage = lazy(async () => {
  const module = await import("@/features/legal/legal-pages");
  return { default: module.TermsOfServicePage };
});
const OAuthCallbackPage = lazy(async () => {
  const module = await import("@/features/cloud-providers/oauth-callback-page");
  return { default: module.OAuthCallbackPage };
});
const SharedPostPage = lazy(async () => {
  const module = await import("@/features/posts/shared-post-page");
  return { default: module.SharedPostPage };
});
const EmbedPostPage = lazy(async () => {
  const module = await import("@/features/posts/embed-post-page");
  return { default: module.EmbedPostPage };
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
const LibraryImportPage = lazy(async () => {
  const module = await import("@/features/library/library-import-page");
  return { default: module.LibraryImportPage };
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
const ProjectsPage = lazy(async () => {
  const module = await import("@/features/projects/projects-page");
  return { default: module.ProjectsPage };
});
const NewProjectPage = lazy(async () => {
  const module = await import("@/features/projects/new-project-page");
  return { default: module.NewProjectPage };
});
const ProjectWorkspacePage = lazy(async () => {
  const module = await import("@/features/projects/project-workspace-page");
  return { default: module.ProjectWorkspacePage };
});
const InvitesPage = lazy(async () => {
  const module = await import("@/features/projects/invites-page");
  return { default: module.InvitesPage };
});
const InviteTokenPage = lazy(async () => {
  const module = await import("@/features/projects/invite-token-page");
  return { default: module.InviteTokenPage };
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
const AppearanceSettingsPage = lazy(async () => {
  const module = await import("@/features/settings/appearance-settings-page");
  return { default: module.AppearanceSettingsPage };
});
const PrivacySettingsPage = lazy(async () => {
  const module = await import("@/features/settings/privacy-settings-page");
  return { default: module.PrivacySettingsPage };
});
const AccountSettingsPage = lazy(async () => {
  const module = await import("@/features/settings/account-settings-page");
  return { default: module.AccountSettingsPage };
});
const BlockedAccountsPage = lazy(async () => {
  const module = await import("@/features/settings/blocked-accounts-page");
  return { default: module.BlockedAccountsPage };
});
const DataExportPage = lazy(async () => {
  const module = await import("@/features/settings/data-export-page");
  return { default: module.DataExportPage };
});
const SongDetailPage = lazy(async () => {
  const module = await import("@/features/songs/song-detail-page");
  return { default: module.SongDetailPage };
});
const AdminDashboardPage = lazy(async () => {
  const module = await import("@/features/admin/dashboard-page");
  return { default: module.AdminDashboardPage };
});
const AdminReportsPage = lazy(async () => {
  const module = await import("@/features/admin/reports-page");
  return { default: module.AdminReportsPage };
});
const AdminReportDetailPage = lazy(async () => {
  const module = await import("@/features/admin/report-detail-page");
  return { default: module.AdminReportDetailPage };
});
const SearchPage = lazy(async () => {
  const module = await import("@/features/search/search-page");
  return { default: module.SearchPage };
});

function RouteFallback() {
  return (
    <div className="page-shell flex min-h-[40vh] items-center justify-center px-4 py-16">
      <div className="glass-panel rounded-[28px] border border-border px-6 py-5 text-center">
        <p className="text-sm font-medium text-foreground">Loading the next screen…</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pulling in the lighter route bundle for this part of MxTrove.
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
    element: <RootLayout />,
    children: [
      {
        path: "/login",
        element: routeElement(<LoginPage />),
      },
      {
        path: "/forgot-password",
        element: routeElement(<ForgotPasswordPage />),
      },
      {
        path: "/reset-password",
        element: routeElement(<ResetPasswordPage />),
      },
      {
        path: "/oauth/callback/:provider",
        element: routeElement(<OAuthCallbackPage />),
      },
      {
        path: "/share/:token",
        element: routeElement(<SharedPostPage />),
      },
      {
        path: "/embed/post/:postId",
        element: routeElement(<EmbedPostPage />),
      },
      {
        element: <OptionalPublicShell />,
        children: [
          { path: "/about", element: routeElement(<AboutPage />) },
          { path: "/privacy", element: routeElement(<PrivacyPolicyPage />) },
          { path: "/terms", element: routeElement(<TermsOfServicePage />) },
          { path: "/post/:postId", element: routeElement(<PostDetailPage />) },
          { path: "/:username", element: routeElement(<ProfilePage />) },
        ],
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
              { path: "/search", element: routeElement(<SearchPage />) },
              { path: "/library", element: routeElement(<LibraryPage />) },
              { path: "/library/songs", element: routeElement(<LibraryPage />) },
              { path: "/library/import", element: routeElement(<LibraryImportPage />) },
              { path: "/library/import/:batchId", element: routeElement(<LibraryImportPage />) },
              { path: "/library/songs/:songId", element: routeElement(<SongDetailPage />) },
              { path: "/projects", element: routeElement(<ProjectsPage />) },
              { path: "/projects/new", element: routeElement(<NewProjectPage />) },
              { path: "/projects/:projectId", element: routeElement(<ProjectWorkspacePage />) },
              { path: "/projects/:projectId/tracks", element: routeElement(<ProjectWorkspacePage />) },
              { path: "/projects/:projectId/activity", element: routeElement(<ProjectWorkspacePage />) },
              { path: "/projects/:projectId/members", element: routeElement(<ProjectWorkspacePage />) },
              { path: "/projects/:projectId/settings", element: routeElement(<ProjectWorkspacePage />) },
              { path: "/projects/:projectId/review", element: routeElement(<ProjectWorkspacePage />) },
              { path: "/invites", element: routeElement(<InvitesPage />) },
              { path: "/invites/:token", element: routeElement(<InviteTokenPage />) },
              { path: "/create", element: routeElement(<CreateIndexPage />) },
              { path: "/create/single", element: routeElement(<CreateSinglePage />) },
              { path: "/create/ep", element: routeElement(<CreateReleasePage kind="ep" />) },
              { path: "/create/album", element: routeElement(<CreateReleasePage kind="album" />) },
              { path: "/post/:postId/edit", element: routeElement(<EditReleasePage />) },
              { path: "/messages", element: routeElement(<MessagesPage />) },
              { path: "/messages/:conversationId", element: routeElement(<ConversationPage />) },
              { path: "/notifications", element: routeElement(<NotificationsPage />) },
              { path: "/admin", element: routeElement(<AdminDashboardPage />) },
              { path: "/admin/reports", element: routeElement(<AdminReportsPage />) },
              { path: "/admin/reports/:reportId", element: routeElement(<AdminReportDetailPage />) },
              { path: "/settings", element: routeElement(<SettingsIndexPage />) },
              { path: "/settings/profile", element: routeElement(<ProfileSettingsPage />) },
              { path: "/settings/storage", element: routeElement(<StorageSettingsPage />) },
              { path: "/settings/appearance", element: routeElement(<AppearanceSettingsPage />) },
              { path: "/settings/privacy", element: routeElement(<PrivacySettingsPage />) },
              { path: "/settings/account", element: routeElement(<AccountSettingsPage />) },
              { path: "/settings/blocked", element: routeElement(<BlockedAccountsPage />) },
              { path: "/settings/account/export", element: routeElement(<DataExportPage />) },
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
            ],
          },
        ],
      },
    ],
  },
]);
