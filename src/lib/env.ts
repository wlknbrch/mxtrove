import packageJson from "../../package.json";

const requiredAppUrl = import.meta.env.VITE_APP_URL;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const googleDriveClientId = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID;
const mediaWorkerUrl = import.meta.env.VITE_MEDIA_WORKER_URL;
const webPushPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;

export const env = {
  appVersion: packageJson.version || "0.0.0",
  appUrl: requiredAppUrl || "http://localhost:5173",
  supabaseUrl: supabaseUrl || "",
  supabasePublishableKey: supabasePublishableKey || "",
  googleDriveClientId: googleDriveClientId || "",
  mediaWorkerUrl: mediaWorkerUrl || "http://localhost:8080",
  webPushPublicKey: webPushPublicKey || "",
  pwaEnabled: import.meta.env.VITE_PWA_ENABLED !== "false",
  demoMode: import.meta.env.VITE_ENABLE_DEMO_MODE === "true",
};

export const envState = {
  hasSupabase: Boolean(env.supabaseUrl && env.supabasePublishableKey),
  hasGoogleDrive: Boolean(env.googleDriveClientId),
  hasMediaWorker: Boolean(env.mediaWorkerUrl),
  hasWebPushKey: Boolean(env.webPushPublicKey),
};
