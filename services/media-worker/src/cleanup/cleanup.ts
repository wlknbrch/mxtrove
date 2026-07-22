import fs from "node:fs/promises";

import { config } from "../config.js";
import { removeJobDir } from "../media/paths.js";
import { supabaseAdmin } from "../supabase/service.js";

export async function runCleanupCycle() {
  const nowIso = new Date().toISOString();

  const { data: jobs, error } = await supabaseAdmin
    .from("media_processing_jobs")
    .select("id, status, expires_at")
    .not("expires_at", "is", null)
    .lt("expires_at", nowIso);

  if (error) {
    throw error;
  }

  for (const job of jobs ?? []) {
    await removeJobDir(job.id);
    await supabaseAdmin
      .from("media_processing_jobs")
      .update({
        status: job.status === "completed" ? "completed" : "expired",
        stage: job.status === "completed" ? "Completed" : "Expired",
        updated_at: nowIso,
      })
      .eq("id", job.id);
  }

  const entries = await fs.readdir(config.mediaTempDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const fullPath = `${config.mediaTempDir}/${entry.name}`;
    const stats = await fs.stat(fullPath).catch(() => null);
    if (!stats) {
      continue;
    }

    if (Date.now() - stats.mtimeMs > config.mediaReadyTtlSeconds * 1000) {
      await fs.rm(fullPath, { recursive: true, force: true });
    }
  }
}
