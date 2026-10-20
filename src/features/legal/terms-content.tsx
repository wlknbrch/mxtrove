import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";
import { OperatorContact } from "@/components/layout/operator-contact";
import { env } from "@/lib/env";

function TermsSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section className="border-t border-white/[0.07] py-6 first:border-t-0 first:pt-0 last:pb-0">
      <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

export function TermsOfServiceContent() {
  return (
    <>
      <TermsSection title="1. Acceptance and operator">
        <p>
          These Terms govern use of the hosted MxTrove service operated by {env.operatorName} at{" "}
          {env.appHostname}. By creating an account or using the service, you agree to these Terms
          and the <Link className="text-accent-secondary hover:text-foreground" to="/privacy">Privacy Policy</Link>.
          Contact: <OperatorContact className="text-accent-secondary hover:text-foreground" />
        </p>
      </TermsSection>

      <TermsSection title="2. Eligibility and accounts">
        <p>
          You must be at least 16, or older if your local law requires it, and able to enter a binding
          agreement. Keep your credentials secure, provide accurate account information, and notify
          {env.operatorName} promptly if you believe your account has been compromised. You are responsible for
          activity performed through your account unless applicable law provides otherwise.
        </p>
      </TermsSection>

      <TermsSection title="3. Free service and donations">
        <p>
          MxTrove is offered free of charge. Donations are voluntary, do not purchase features,
          priority, ownership, or guaranteed availability, and are processed by PayPal under its own
          terms. Donations may be used toward hosting, maintenance, and a future dedicated MxTrove server.
        </p>
      </TermsSection>

      <TermsSection title="4. Personal cloud storage">
        <p>
          You provide and control the supported cloud account used for original files. You are
          responsible for provider terms, fees, quotas, permissions, backups, and continued account
          access. Disconnecting a provider, moving or deleting files, revoking permissions, or allowing
          sharing links to expire can make MxTrove media unavailable.
        </p>
      </TermsSection>

      <TermsSection title="5. Your content and permissions">
        <p>
          You retain ownership of music, artwork, lyrics, messages, and other content you submit.
          You grant {env.operatorName} a non-exclusive, worldwide, royalty-free license limited to hosting,
          processing, reproducing, transmitting, and displaying that content as necessary to operate
          MxTrove and honor the visibility, collaboration, and sharing choices you make. This license
          ends when the content is deleted, subject to technical backups, legal retention, and copies
          already received or independently shared by others.
        </p>
        <p>You must have the rights and permissions required to upload, publish, and share your content, including contributions from collaborators.</p>
      </TermsSection>

      <TermsSection title="6. Acceptable use">
        <p>You may not use MxTrove to violate law or third-party rights; upload malware or unlawful, infringing, hateful, exploitative, or non-consensual material; impersonate others; harass users; evade privacy or access controls; scrape or overload the service; probe security without permission; or interfere with another person's cloud files or account.</p>
        <p>Reports may be reviewed and content access may be restricted where reasonably necessary to protect users, comply with law, or investigate abuse.</p>
      </TermsSection>

      <TermsSection title="7. Collaboration and sharing">
        <p>
          Project roles, follower visibility, unlisted links, and direct messages control access inside
          MxTrove, but recipients may capture or redistribute material. Only invite people you trust,
          review permissions before publishing, and revoke links or memberships that are no longer needed.
        </p>
      </TermsSection>

      <TermsSection title="8. Availability, previews, and backups">
        <p>
          MxTrove is an evolving service and may change, experience interruptions, or discontinue
          features. Audio analysis, waveforms, tempo, key detection, transcoding, social previews,
          and notifications are provided as convenience features and may be inaccurate or unavailable.
          MxTrove is not a backup service. Keep independent copies of all important files and metadata.
        </p>
      </TermsSection>

      <TermsSection title="9. Third-party services">
        <p>
          Supabase, Google, Dropbox, Microsoft, PayPal, browser push providers, and linked websites are
          independent services with their own terms and privacy practices. {env.operatorName} is not responsible
          for their availability, policy changes, account decisions, or data handling beyond what the
          law requires of MxTrove as the service operator.
        </p>
      </TermsSection>

      <TermsSection title="10. Suspension and termination">
        <p>
          You may stop using MxTrove and request account deletion at any time. {env.operatorName} may restrict or
          suspend access where reasonably necessary for security, serious or repeated rule violations,
          legal compliance, or protection of the service and its users. Where appropriate, notice and
          an opportunity to clarify will be provided.
        </p>
      </TermsSection>

      <TermsSection title="11. Liability">
        <p>
          Nothing in these Terms limits liability that cannot legally be limited, including liability
          for intent, gross negligence, injury to life, body or health, or mandatory product liability.
          For ordinary negligence, liability is limited to breaches of essential contractual duties and
          to damage that was reasonably foreseeable. Mandatory consumer rights remain unaffected.
        </p>
      </TermsSection>

      <TermsSection title="12. Governing law and changes">
        <p>
          German law applies, excluding conflict-of-law rules, while mandatory protections of the
          country where a consumer habitually resides remain unaffected. If any provision is invalid,
          the remaining provisions continue to apply.
        </p>
        <p>
          These Terms may change to reflect legal, security, or service developments. Material changes
          will be communicated where reasonably possible. Continuing to use the service after changes
          take effect constitutes acceptance where permitted by law; otherwise the existing statutory
          rules apply.
        </p>
      </TermsSection>
      <TermsSection title="13. Open-source software">
        <p>
          These Terms govern access to this hosted service. The MxTrove software is
          separately licensed under the GNU Affero General Public License, version 3.
          These service Terms do not limit rights granted by that software license.
          User content remains subject to its owners&apos; rights.
        </p>
        <p>
          <a className="text-accent-secondary hover:text-foreground" href={env.sourceUrl} target="_blank" rel="noreferrer">Get the source code and license.</a>
        </p>
      </TermsSection>
    </>
  );
}
