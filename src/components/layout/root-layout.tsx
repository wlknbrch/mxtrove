import { Outlet } from "react-router-dom";

import { GlobalPlayer } from "@/components/audio/global-player";

export function RootLayout() {
  return (
    <>
      <Outlet />
      <GlobalPlayer />
    </>
  );
}
