import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
  type PropsWithChildren,
} from "react";

import {
  defaultAppearanceSettings,
  getAppearanceSettings,
  saveAppearanceSettings,
} from "@/features/appearance/api";
import { useAuth } from "@/hooks/use-auth";
import type { ProfileAppearanceSettings } from "@/types/domain";

type AppearanceValues = Omit<
  ProfileAppearanceSettings,
  "profile_id" | "created_at" | "updated_at"
>;

interface AppearanceContextValue {
  settings: AppearanceValues;
  isSyncing: boolean;
  updateSettings: (nextSettings: AppearanceValues) => Promise<void>;
}

const STORAGE_KEY = "mxshare:appearance:v2";
const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function readLocalSettings(): AppearanceValues {
  if (typeof window === "undefined") {
    return defaultAppearanceSettings;
  }
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<AppearanceValues>;
    return { ...defaultAppearanceSettings, ...stored };
  } catch {
    return defaultAppearanceSettings;
  }
}

function applyAppearance(settings: AppearanceValues) {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.accent = settings.accent;
  root.dataset.density = settings.interface_density;
  root.dataset.contrast = settings.increase_contrast ? "high" : "normal";
  root.dataset.transparency = settings.reduce_transparency ? "reduced" : "normal";
  root.dataset.motion = settings.reduce_motion || settings.reduced_motion ? "reduced" : "normal";
  root.dataset.textSize = settings.larger_ui_text ? "large" : "normal";
}

export function AppearanceProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppearanceValues>(readLocalSettings);
  const [isSyncing, setIsSyncing] = useState(false);

  const commitSettings = useEffectEvent((nextSettings: AppearanceValues) => {
    setSettings(nextSettings);
    applyAppearance(nextSettings);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
  });

  useEffect(() => {
    applyAppearance(settings);
  }, [settings]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let active = true;
    setIsSyncing(true);
    void getAppearanceSettings(user.id)
      .then((remoteSettings) => {
        if (!active || !remoteSettings) {
          return;
        }
        const {
          profile_id: _profileId,
          created_at: _createdAt,
          updated_at: _updatedAt,
          ...values
        } = remoteSettings;
        commitSettings(values);
      })
      .finally(() => {
        if (active) {
          setIsSyncing(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  async function updateSettings(nextSettings: AppearanceValues) {
    commitSettings(nextSettings);
    if (user?.id) {
      await saveAppearanceSettings(nextSettings);
    }
  }

  return (
    <AppearanceContext.Provider value={{ settings, isSyncing, updateSettings }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used within AppearanceProvider.");
  }
  return context;
}
