const requiredAppUrl = import.meta.env.VITE_APP_URL;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const googleDriveClientId = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID;

export const env = {
  appUrl: requiredAppUrl || "http://localhost:5173",
  supabaseUrl: supabaseUrl || "",
  supabasePublishableKey: supabasePublishableKey || "",
  googleDriveClientId: googleDriveClientId || "",
  demoMode: import.meta.env.VITE_ENABLE_DEMO_MODE === "true",
};

export const envState = {
  hasSupabase: Boolean(env.supabaseUrl && env.supabasePublishableKey),
  hasGoogleDrive: Boolean(env.googleDriveClientId),
};
