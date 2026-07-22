import { createClient } from "@supabase/supabase-js";

import { config } from "../config.js";

export const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServerKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
