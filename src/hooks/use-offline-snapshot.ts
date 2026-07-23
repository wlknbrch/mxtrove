import { useEffect, useRef, useState } from "react";

const SNAPSHOT_VERSION = 2;
const SNAPSHOT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const SNAPSHOT_MAX_JSON_LENGTH = 3_000_000;

interface OfflineSnapshotEnvelope<T> {
  version: number;
  savedAt: number;
  data: T;
}

function safeSerialize<T>(value: T) {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export function readOfflineSnapshot<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) {
      return null;
    }
    const envelope = JSON.parse(rawValue) as OfflineSnapshotEnvelope<T>;
    if (
      envelope.version !== SNAPSHOT_VERSION
      || Date.now() - envelope.savedAt > SNAPSHOT_MAX_AGE_MS
    ) {
      window.localStorage.removeItem(key);
      return null;
    }
    return envelope.data;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function writeOfflineSnapshot<T>(key: string, data: T) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const serialized = JSON.stringify({
      version: SNAPSHOT_VERSION,
      savedAt: Date.now(),
      data,
    } satisfies OfflineSnapshotEnvelope<T>);
    if (serialized.length > SNAPSHOT_MAX_JSON_LENGTH) {
      return false;
    }
    window.localStorage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

export function useOfflineSnapshot<T>(key: string, liveData: T | undefined) {
  const [snapshot, setSnapshot] = useState<T | null>(() => readOfflineSnapshot<T>(key));
  const lastSnapshotJsonRef = useRef<string | null>(safeSerialize(snapshot));

  useEffect(() => {
    const nextSnapshot = readOfflineSnapshot<T>(key);
    lastSnapshotJsonRef.current = safeSerialize(nextSnapshot);
    setSnapshot(nextSnapshot);
  }, [key]);

  useEffect(() => {
    if (liveData === undefined) {
      return;
    }

    const nextSnapshotJson = safeSerialize(liveData);
    if (!nextSnapshotJson || nextSnapshotJson === lastSnapshotJsonRef.current) {
      return;
    }

    if (!writeOfflineSnapshot(key, liveData)) {
      return;
    }

    lastSnapshotJsonRef.current = nextSnapshotJson;
    setSnapshot(liveData);
  }, [key, liveData]);

  return snapshot;
}
