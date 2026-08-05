import { Link, Outlet } from "react-router-dom";

import { AppShell } from "@/components/layout/app-shell";
import { LegalFooter } from "@/components/layout/legal-footer";
import { MxShareMark } from "@/components/layout/mxshare-mark";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export function OptionalPublicShell() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="page-shell min-h-screen p-6">
        <Card className="mx-auto max-w-lg">
          <CardTitle>Opening MxTrove…</CardTitle>
        </Card>
      </div>
    );
  }

  if (user) {
    return <AppShell />;
  }

  return (
    <div className="page-shell min-h-screen px-4 py-6 pb-36 md:px-8">
      <header className="mx-auto mb-8 flex max-w-7xl items-center justify-between gap-4">
        <Link to="/login" className="flex min-w-0 items-center gap-3">
          <MxShareMark className="size-11 shrink-0" />
          <div className="min-w-0">
            <p className="font-display text-2xl">MxTrove</p>
            <p className="truncate text-xs text-muted-foreground">Share music. Share versions.</p>
          </div>
        </Link>
        <Link to="/login">
          <Button variant="secondary" size="sm">Sign in</Button>
        </Link>
      </header>
      <main className="mx-auto max-w-7xl">
        <Outlet />
      </main>
      <LegalFooter className="mx-auto mt-10 max-w-7xl pb-4" />
    </div>
  );
}
