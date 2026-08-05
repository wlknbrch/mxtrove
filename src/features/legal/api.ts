import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";

export interface TermsAcceptance {
  profile_id: string;
  terms_version: string;
  accepted_at: string;
}

export async function getTermsAcceptance(profileId: string): Promise<TermsAcceptance | null> {
  if (isDemoModeEnabled()) {
    await createDemoDelay(40);
    return null;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("terms_acceptances")
    .select("profile_id, terms_version, accepted_at")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as TermsAcceptance | null;
}

export async function acceptTermsOfService(version: string): Promise<TermsAcceptance> {
  if (isDemoModeEnabled()) {
    await createDemoDelay(80);
    throw new Error("The demo account does not require Terms acceptance.");
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("accept_terms_of_service", {
    accepted_version: version,
  });

  if (error) {
    throw error;
  }

  return data as TermsAcceptance;
}
