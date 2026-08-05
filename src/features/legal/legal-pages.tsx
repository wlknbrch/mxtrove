import type { PropsWithChildren, ReactNode } from "react";
import { Cloud, ExternalLink, HeartHandshake, Music2, Server, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TermsOfServiceContent } from "@/features/legal/terms-content";
import { CURRENT_TERMS_LAST_UPDATED } from "@/features/legal/terms";
import { cn } from "@/lib/utils";

const CONTACT_EMAIL = "contact@wlknbrch.com";
const LAST_UPDATED = "August 4, 2026";

function DocumentSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section className="border-t border-white/[0.07] py-6 first:border-t-0 first:pt-0 last:pb-0">
      <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

function LegalDocument({
  eyebrow,
  title,
  description,
  lastUpdated = LAST_UPDATED,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="min-w-0 md:px-8 md:py-8">{children}</Card>
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card className="rounded-[26px]">
            <Badge variant="neutral">Last updated</Badge>
            <p className="mt-3 text-sm font-medium">{lastUpdated}</p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              These documents apply to the hosted MxTrove service at mxtrove.wlknbrch.com.
              Independent deployments need their own operator information and policies.
            </p>
          </Card>
          <Card className="rounded-[26px]">
            <p className="text-sm font-medium">Questions or requests</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-3 block break-all text-sm text-accent-secondary transition-colors hover:text-foreground"
            >
              {CONTACT_EMAIL}
            </a>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="About this app"
        title="A working archive for music in motion"
        description="MxTrove keeps the creative process connected without turning your private originals into somebody else's storage product."
      />

      <Card className="relative overflow-hidden border-accent/20 bg-[radial-gradient(circle_at_85%_15%,rgba(var(--accent-rgb),0.2),transparent_30%),linear-gradient(145deg,rgba(var(--accent-rgb),0.12),rgba(255,255,255,0.025))] md:px-8 md:py-8">
        <div className="relative z-10 max-w-3xl">
          <Badge variant="accent">Developed by WLKNBRCH</Badge>
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
            Free to use. Yours to fill.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
            MxTrove was designed and developed by WLKNBRCH for musicians who want to share
            works in progress, preserve versions, and collaborate without surrendering their
            original files to a new paid storage silo.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="https://paypal.me/WLKNBRCH"
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "primary", size: "lg" })}
            >
              <HeartHandshake className="size-5" />
              Donate via PayPal
            </a>
            <a
              href="https://wlknbrch.com"
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              Visit wlknbrch.com
              <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-3">
        {[
          {
            icon: Music2,
            title: "Always free",
            copy: "There is no subscription tier and donating never unlocks extra product access.",
          },
          {
            icon: Cloud,
            title: "Your own cloud",
            copy: "Original files live in the Google Drive, Dropbox, or OneDrive account you connect.",
          },
          {
            icon: Server,
            title: "Community supported",
            copy: "If support becomes sustainable, donations will help move MxTrove onto its own dedicated server.",
          },
        ].map(({ icon: Icon, title, copy }) => (
          <Card key={title} className="rounded-[26px]">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent-secondary">
              <Icon className="size-5" />
            </div>
            <h2 className="mt-5 font-display text-xl font-semibold">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{copy}</p>
          </Card>
        ))}
      </div>

      <Card className="flex flex-col gap-5 rounded-[26px] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">The practical details</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Read how the hosted service handles data and the rules that keep it usable for everyone.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/privacy" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <ShieldCheck className="size-4" />
            Privacy policy
          </Link>
          <Link to="/terms" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Terms of Service
          </Link>
        </div>
      </Card>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <LegalDocument
      eyebrow="Legal / Privacy"
      title="Privacy Policy"
      description="What the hosted MxTrove service processes, why it is needed, and the choices you retain."
    >
      <DocumentSection title="1. Controller and scope">
        <p>
          WLKNBRCH operates the hosted MxTrove service available at mxtrove.wlknbrch.com and
          is responsible for the processing described in this policy. Contact: {" "}
          <a className="text-accent-secondary hover:text-foreground" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
        <p>
          This policy covers the hosted service only. If somebody operates an independent copy
          of MxTrove, that operator is responsible for its own privacy information and practices.
        </p>
      </DocumentSection>

      <DocumentSection title="2. Data MxTrove processes">
        <p><strong className="text-foreground">Account and authentication data:</strong> email address, authentication identifiers, login/session information, and optional identity-provider data supplied through Supabase Auth.</p>
        <p><strong className="text-foreground">Profile and social data:</strong> username, display name, biography, avatar reference, links, follows, hearts, comments, messages, notifications, blocks, reports, and privacy preferences.</p>
        <p><strong className="text-foreground">Music and collaboration metadata:</strong> songs, versions, lyrics, credits, release settings, projects, memberships, feedback, markers, drafts, cloud file identifiers, filenames, technical audio metadata, and sharing status.</p>
        <p><strong className="text-foreground">Protected media:</strong> browser-safe previews and permitted message attachments may be processed and stored on the MxTrove server when required for restricted playback, collaboration, or messaging.</p>
        <p><strong className="text-foreground">Technical data:</strong> IP address and ordinary server logs, browser/device information, error and security events, and local app state required for sessions, appearance, offline snapshots, and upload continuity.</p>
      </DocumentSection>

      <DocumentSection title="3. Your cloud files">
        <p>
          Private originals remain in the Google Drive, Dropbox, or OneDrive account you connect.
          MxTrove stores references and folder metadata in its database, but does not use Supabase
          as a permanent store for original audio files.
        </p>
        <p>
          Dropbox and OneDrive access tokens are kept in browser session storage; Google Drive
          access is held in the active browser session. They are used to perform actions you request
          against your provider and are not stored as permanent credentials in the MxTrove database.
          Public previews may receive provider sharing links when you explicitly publish them.
        </p>
      </DocumentSection>

      <DocumentSection title="4. Purposes and legal bases">
        <p>MxTrove processes data to create and secure accounts, provide storage connections, publish releases according to chosen visibility, enable social and collaboration features, deliver messages and notifications, prevent abuse, diagnose faults, and comply with legal obligations.</p>
        <p>Depending on the activity, processing is necessary to provide the service you request, based on your consent, required by law, or based on legitimate interests in operating a secure, reliable, and abuse-resistant creative platform. You may withdraw consent for future processing where consent is the legal basis.</p>
      </DocumentSection>

      <DocumentSection title="5. Visibility and recipients">
        <p>
          Profile information and content are disclosed according to the visibility and privacy
          controls you choose. Public releases and profiles can be accessed and shared outside
          MxTrove. Followers-only, unlisted, project, and direct-message content is subject to the
          app's access controls, but no internet transmission can be guaranteed absolutely private.
        </p>
        <p>
          Service providers may process data where necessary, including Supabase for authentication
          and database services, the VPS hosting provider, your selected cloud-storage provider,
          and browser push services when notifications are enabled. Opening the donation link sends
          you to PayPal under PayPal's own privacy terms. Legal authorities may receive data where
          disclosure is required by applicable law.
        </p>
        <p>Some providers may process data outside the European Economic Area under their applicable transfer safeguards.</p>
      </DocumentSection>

      <DocumentSection title="6. Retention and deletion">
        <p>
          Account and service data is generally retained while your account is active and for as
          long as needed to provide the relevant feature. Account deletion is scheduled with a
          14-day grace period so it can be cancelled. Afterward, data is deleted or anonymized where
          feasible, except where retention is required for security, legal obligations, dispute
          resolution, or the rights of other users.
        </p>
        <p>
          Files in your personal cloud remain under your control and are not automatically deleted
          with the MxTrove account. Public copies, recipient-held messages, backups, and content
          already shared outside the service may not disappear immediately or may need to be retained
          where the law permits.
        </p>
      </DocumentSection>

      <DocumentSection title="7. Local storage and similar technologies">
        <p>
          MxTrove uses browser storage and Supabase session mechanisms that are necessary for login,
          cloud-provider sessions, interface preferences, upload state, and bounded offline access.
          The hosted app does not currently use advertising trackers or sell personal data.
        </p>
      </DocumentSection>

      <DocumentSection title="8. Your rights">
        <p>
          Subject to applicable law, you may request access, correction, deletion, restriction,
          portability, or object to certain processing. You may withdraw consent at any time without
          affecting earlier lawful processing. MxTrove also provides profile editing, privacy controls,
          data export, and account deletion inside the app.
        </p>
        <p>
          Send requests to <a className="text-accent-secondary hover:text-foreground" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          You may also complain to the competent data-protection supervisory authority. Identity
          verification may be required before fulfilling a request.
        </p>
      </DocumentSection>

      <DocumentSection title="9. Children">
        <p>
          The hosted service is not directed to children under 16. Users under the age required for
          valid consent in their country must have authorization from a parent or legal guardian.
        </p>
      </DocumentSection>

      <DocumentSection title="10. Security and policy changes">
        <p>
          MxTrove uses access controls, row-level database security, short-lived protected-media URLs,
          file validation, and transport encryption where supported. Users remain responsible for
          securing their account, cloud account, devices, and shared links.
        </p>
        <p>
          This policy may be updated when the service or law changes. Material changes will be
          communicated through the service where reasonably possible, and the date above will be updated.
        </p>
      </DocumentSection>
    </LegalDocument>
  );
}

export function TermsOfServicePage() {
  return (
    <LegalDocument
      eyebrow="Legal / Service"
      title="Terms of Service"
      description="The terms for using the WLKNBRCH-hosted MxTrove service."
      lastUpdated={CURRENT_TERMS_LAST_UPDATED}
    >
      <TermsOfServiceContent />
    </LegalDocument>
  );
}
