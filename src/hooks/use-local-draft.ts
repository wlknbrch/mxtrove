import { useEffect, useState } from "react";

function readDraft<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useLocalDraft<T>(key: string, fallback: T) {
  const [draft, setDraft] = useState<T>(() => readDraft(key, fallback));

  useEffect(() => {
    setDraft(readDraft(key, fallback));
  }, [key]);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(draft));
    } catch {
      // Draft persistence is best-effort when storage is blocked or exhausted.
    }
  }, [draft, key]);

  function clearDraft() {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // The in-memory reset still works when browser storage is unavailable.
    }
    setDraft(fallback);
  }

  return [draft, setDraft, clearDraft] as const;
}
