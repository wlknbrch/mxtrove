import { useEffect, useState } from "react";
import { Check, Eye, Gauge, MonitorCog, Palette, PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useAppearance } from "@/features/appearance/appearance-provider";
import { SettingsSidebar } from "@/features/settings/settings-shell";
import { cn } from "@/lib/utils";

const accentOptions = [
  { value: "violet", label: "Violet", color: "#9d5cff" },
  { value: "rose", label: "Rose", color: "#ed5f98" },
  { value: "cyan", label: "Cyan", color: "#22b9d5" },
  { value: "emerald", label: "Emerald", color: "#26b982" },
  { value: "amber", label: "Amber", color: "#d99530" },
] as const;

export function AppearanceSettingsPage() {
  const { settings, isSyncing, updateSettings } = useAppearance();
  const [draft, setDraft] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  async function save() {
    setIsSaving(true);
    try {
      await updateSettings(draft);
      toast.success("Appearance saved across your account.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save appearance settings.");
    } finally {
      setIsSaving(false);
    }
  }

  function toggle(key: keyof typeof draft) {
    setDraft((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Appearance"
        description="Shape the studio around your eyes and your working rhythm. Every option applies immediately and follows your account."
      />

      <div className="grid gap-6 2xl:grid-cols-[310px_minmax(0,1fr)]">
        <SettingsSidebar driveReady />
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>Theme and accent</CardTitle>
                  <CardDescription className="mt-2">
                    Dark remains the MxTrove default. Light is a designed surface, not an inverted afterthought.
                  </CardDescription>
                </div>
                <Badge variant="accent">{isSyncing ? "Syncing" : "Account synced"}</Badge>
              </div>
            </CardHeader>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <MonitorCog className="size-4 text-accent-secondary" />
                  Theme
                </span>
                <Select
                  value={draft.theme}
                  onChange={(event) => {
                    const theme = event.currentTarget.value as typeof draft.theme;
                    setDraft((current) => ({ ...current, theme }));
                  }}
                >
                  <option value="system">Follow system</option>
                  <option value="dark">Dark studio</option>
                  <option value="light">Light archive</option>
                </Select>
              </label>

              <label className="space-y-2">
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <Gauge className="size-4 text-accent-secondary" />
                  Interface density
                </span>
                <Select
                  value={draft.interface_density}
                  onChange={(event) => {
                    const interfaceDensity = event.currentTarget.value as typeof draft.interface_density;
                    setDraft((current) => ({
                      ...current,
                      interface_density: interfaceDensity,
                    }));
                  }}
                >
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </Select>
              </label>
            </div>

            <div className="mt-6">
              <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium">
                <Palette className="size-4 text-accent-secondary" />
                Accent
              </p>
              <div className="grid gap-3 sm:grid-cols-5">
                {accentOptions.map((accent) => (
                  <button
                    key={accent.value}
                    type="button"
                    className={cn(
                      "flex items-center gap-3 rounded-[20px] border px-4 py-3 text-left transition-colors",
                      draft.accent === accent.value
                        ? "border-accent/50 bg-accent/12"
                        : "border-border bg-surface-soft hover:border-border-strong",
                    )}
                    onClick={() => setDraft((current) => ({ ...current, accent: accent.value }))}
                  >
                    <span
                      className="size-4 rounded-full shadow-[0_0_18px_currentColor]"
                      style={{ backgroundColor: accent.color, color: accent.color }}
                    />
                    <span className="text-sm">{accent.label}</span>
                    {draft.accent === accent.value ? <Check className="ml-auto size-4" /> : null}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <SettingsToggleCard
              icon={PlayCircle}
              title="Player"
              rows={[
                ["show_waveforms", "Show waveforms", "Keep detailed waveforms visible throughout playback."],
                ["autoplay_next", "Autoplay next", "Continue through the active queue."],
                ["remember_volume", "Remember volume", "Keep your level between sessions."],
                ["reduced_motion", "Quieter player motion", "Remove decorative movement from playback."],
              ]}
              values={draft}
              onToggle={toggle}
            />
            <SettingsToggleCard
              icon={Eye}
              title="Accessibility"
              rows={[
                ["increase_contrast", "Increase contrast", "Strengthen text and surface boundaries."],
                ["reduce_transparency", "Reduce transparency", "Use opaque panels instead of glass."],
                ["reduce_motion", "Reduce motion", "Minimize animations throughout the app."],
                ["larger_ui_text", "Larger interface text", "Increase the base UI text size."],
              ]}
              values={draft}
              onToggle={toggle}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save appearance"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsToggleCard({
  icon: Icon,
  title,
  rows,
  values,
  onToggle,
}: {
  icon: typeof Eye;
  title: string;
  rows: Array<[keyof typeof values, string, string]>;
  values: ReturnType<typeof useAppearance>["settings"];
  onToggle: (key: keyof typeof values) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-3 text-2xl">
          <Icon className="size-5 text-accent-secondary" />
          {title}
        </CardTitle>
      </CardHeader>
      <div className="space-y-3">
        {rows.map(([key, label, description]) => (
          <button
            key={key}
            type="button"
            className="flex w-full items-center gap-4 rounded-[22px] border border-border bg-surface-soft px-4 py-4 text-left"
            onClick={() => onToggle(key)}
          >
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{label}</span>
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">{description}</span>
            </span>
            <span
              className={cn(
                "relative h-7 w-12 rounded-full border transition-colors",
                values[key]
                  ? "border-accent/50 bg-accent/75"
                  : "border-border bg-background-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 size-4 rounded-full bg-white transition-transform",
                  values[key] ? "translate-x-6" : "translate-x-1",
                )}
              />
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
