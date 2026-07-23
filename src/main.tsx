import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@/styles/globals.css";

import { registerAppServiceWorker, resetDevelopmentServiceWorkers } from "@/lib/pwa";

async function bootstrap() {
  if (import.meta.env.DEV) {
    const reloadingForWorkerReset = await resetDevelopmentServiceWorkers();
    if (reloadingForWorkerReset) {
      return;
    }
  }

  const [{ StrictMode }, { createRoot }, { App }] = await Promise.all([
    import("react"),
    import("react-dom/client"),
    import("@/app/App"),
  ]);

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  if (!import.meta.env.DEV) {
    void registerAppServiceWorker();
  }
}

void bootstrap();
