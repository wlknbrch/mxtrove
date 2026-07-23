import fs from "node:fs/promises";

import { config } from "../config.js";
import { LocalProtectedMediaStorage } from "./local-storage.js";

export const protectedMediaStorage = new LocalProtectedMediaStorage();

export async function ensureProtectedMediaStorage() {
  await fs.mkdir(config.protectedMediaDir, { recursive: true, mode: 0o700 });
}
