export function readPersistentBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;

  const storedValue = window.localStorage.getItem(key);
  if (storedValue === null) return fallback;
  return storedValue === "true";
}

export function writePersistentBoolean(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, String(value));
}

export function readPersistentValue<T extends string>(
  key: string,
  allowedValues: readonly T[],
  fallback: T,
) {
  if (typeof window === "undefined") return fallback;

  const storedValue = window.localStorage.getItem(key);
  return allowedValues.includes(storedValue as T) ? storedValue as T : fallback;
}

export function writePersistentValue(key: string, value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}
