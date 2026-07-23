import { requireSupabase } from "@/lib/service-utils";

export async function updateAccountPassword(password: string) {
  const client = requireSupabase();
  const { error } = await client.auth.updateUser({ password });
  if (error) {
    throw error;
  }
}

export async function updateAccountEmail(email: string) {
  const client = requireSupabase();
  const { error } = await client.auth.updateUser({ email });
  if (error) {
    throw error;
  }
}

export async function confirmAccountPassword(input: {
  email: string;
  password: string;
}) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword(input);
  if (error) {
    throw error;
  }
  if (!data.user || data.user.email?.toLowerCase() !== input.email.toLowerCase()) {
    throw new Error("The authenticated account did not match the current profile.");
  }
}

export async function requestAccountDeletion(input: {
  gracePeriodDays?: number;
  deleteCloudFiles?: boolean;
}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("request_account_deletion", {
    grace_period_days: input.gracePeriodDays ?? 14,
    remove_cloud_files: input.deleteCloudFiles ?? false,
  });
  if (error) {
    throw error;
  }
  return data as string;
}

export async function cancelAccountDeletion() {
  const client = requireSupabase();
  const { error } = await client.rpc("cancel_account_deletion");
  if (error) {
    throw error;
  }
}

export interface DataExportRequest {
  id: string;
  profile_id: string;
  status: "queued" | "processing" | "ready" | "failed" | "expired";
  format: "json" | "json_csv";
  protected_asset_id: string | null;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  error_message: string | null;
}

export async function requestDataExport(format: "json" | "json_csv") {
  const client = requireSupabase();
  const { data, error } = await client.rpc("request_data_export", {
    export_format: format,
  });
  if (error) {
    throw error;
  }
  return data as string;
}

export async function listDataExportRequests(profileId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("data_export_requests")
    .select("*")
    .eq("profile_id", profileId)
    .order("requested_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as DataExportRequest[];
}
