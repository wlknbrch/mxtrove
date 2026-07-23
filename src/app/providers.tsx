import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy, type PropsWithChildren } from "react";
import { Toaster } from "sonner";

import { AuthProvider } from "@/hooks/use-auth";
import { AppearanceProvider } from "@/features/appearance/appearance-provider";
import { queryClient } from "@/lib/query-client";

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(async () => {
      const module = await import("@tanstack/react-query-devtools");
      return { default: module.ReactQueryDevtools };
    })
  : null;

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppearanceProvider>
          {children}
          <Toaster richColors position="top-right" theme="system" />
        </AppearanceProvider>
      </AuthProvider>
      {ReactQueryDevtools ? (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  );
}
