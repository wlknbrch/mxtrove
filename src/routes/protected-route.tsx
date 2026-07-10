import { Navigate, Outlet } from "react-router-dom";

import { Card, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { env } from "@/lib/env";

export function ProtectedRoute() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardTitle>Restoring your session…</CardTitle>
        </Card>
      </div>
    );
  }

  if (!user && !env.demoMode) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
