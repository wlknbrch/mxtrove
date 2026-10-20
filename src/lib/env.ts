import packageJson from "../../package.json";

const requiredAppUrl = import.meta.env.VITE_APP_URL;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const googleDriveClientId = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID;
const dropboxClientId = import.meta.env.VITE_DROPBOX_CLIENT_ID;
const oneDriveClientId = import.meta.env.VITE_ONEDRIVE_CLIENT_ID;
const mediaWorkerUrl = import.meta.env.VITE_MEDIA_WORKER_URL;
const webPushPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
const appHostname = (() => {
  try { return new URL(requiredAppUrl || "http://localhost:5173").hostname; }
  catch { return "localhost"; }
})();
const isOfficialInstance = ["mxtrove.wlknbrch.com", "www.mxtrove.wlknbrch.com"].includes(appHostname);

export const env = {
  appVersion: packageJson.version || "0.0.0",
  appUrl: requiredAppUrl || "http://localhost:5173",
  appHostname,
  isOfficialInstance,
  operatorName: import.meta.env.VITE_OPERATOR_NAME || (isOfficialInstance ? "Tom Maucksch" : "Independent operator"),
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || (isOfficialInstance ? "mxtrove@wlknbrch.com" : ""),
  sourceUrl: import.meta.env.VITE_SOURCE_URL || "https://github.com/wlknbrch/mxtrove",
  supabaseUrl: supabaseUrl || "",
  supabasePublishableKey: supabasePublishableKey || "",
  googleDriveClientId: googleDriveClientId || "",
  dropboxClientId: dropboxClientId || "",
  oneDriveClientId: oneDriveClientId || "",
  mediaWorkerUrl: mediaWorkerUrl || "http://localhost:8080",
  webPushPublicKey: webPushPublicKey || "",
  pwaEnabled: import.meta.env.VITE_PWA_ENABLED !== "false",
  demoMode: import.meta.env.VITE_ENABLE_DEMO_MODE === "true",
};

export const envState = {
  hasSupabase: Boolean(env.supabaseUrl && env.supabasePublishableKey),
  hasGoogleDrive: Boolean(env.googleDriveClientId),
  hasDropbox: Boolean(env.dropboxClientId),
  hasOneDrive: Boolean(env.oneDriveClientId),
  hasMediaWorker: Boolean(env.mediaWorkerUrl),
  hasWebPushKey: Boolean(env.webPushPublicKey),
};
