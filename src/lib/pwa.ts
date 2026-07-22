import { env, envState } from "@/lib/env";

function decodeBase64Url(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const normalized = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const output = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }

  return output;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null) {
  if (!buffer) {
    return null;
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary);
}

export function supportsWebPush() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerAppServiceWorker() {
  if (!env.pwaEnabled || !supportsWebPush()) {
    return null;
  }

  return navigator.serviceWorker.register("/sw.js");
}

export async function getCurrentPushSubscription() {
  if (!supportsWebPush()) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeCurrentDeviceToPush() {
  if (!envState.hasWebPushKey) {
    throw new Error("VITE_WEB_PUSH_PUBLIC_KEY is missing.");
  }
  if (!supportsWebPush()) {
    throw new Error("This browser does not support service workers and push notifications.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Push permission was not granted.");
  }

  await registerAppServiceWorker();
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return existing;
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeBase64Url(env.webPushPublicKey),
  });
}

export async function unsubscribeCurrentDeviceFromPush() {
  const subscription = await getCurrentPushSubscription();
  if (!subscription) {
    return null;
  }

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}

export function serializePushSubscription(subscription: PushSubscription) {
  return {
    endpoint: subscription.endpoint,
    p256dh: arrayBufferToBase64(subscription.getKey("p256dh")) ?? "",
    auth: arrayBufferToBase64(subscription.getKey("auth")) ?? "",
  };
}
