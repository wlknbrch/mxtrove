import type { PropsWithChildren } from "react";

import { Music4 } from "lucide-react";

import { Card } from "@/components/ui/card";

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-5 py-12">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-panel hidden rounded-[36px] border border-border p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3 text-lg font-semibold">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
              <Music4 className="size-5" />
            </div>
            <span className="font-display text-2xl">MxShare</span>
          </div>
          <div className="space-y-5">
            <p className="max-w-xl font-display text-5xl font-semibold leading-[1.02] tracking-[-0.04em]">
              Build, archive, and publish unfinished music without losing the process.
            </p>
            <p className="max-w-lg text-base text-muted-foreground">
              Private library management, version-aware singles, album projects, and a social feed designed for musicians who release in progress.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Card className="min-h-28 border-white/6 bg-white/3">
              <p className="text-sm text-muted-foreground">Private Originals</p>
              <p className="mt-3 font-display text-2xl font-semibold">Google Drive</p>
            </Card>
            <Card className="min-h-28 border-white/6 bg-white/3">
              <p className="text-sm text-muted-foreground">Singles Update</p>
              <p className="mt-3 font-display text-2xl font-semibold">Keeps Hearts</p>
            </Card>
            <Card className="min-h-28 border-white/6 bg-white/3">
              <p className="text-sm text-muted-foreground">Library Stages</p>
              <p className="mt-3 font-display text-2xl font-semibold">Idea to Final</p>
            </Card>
          </div>
        </section>
        <section>{children}</section>
      </div>
    </div>
  );
}
