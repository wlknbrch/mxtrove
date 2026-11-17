import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoSongs } from "@/lib/demo-data";
const mocks = vi.hoisted(() => ({ detail: vi.fn(), connections: vi.fn() }));
vi.mock("@/hooks/use-app-viewer", () => ({ useAppViewer: () => ({ userId: "owner", isSignedIn: true }) }));
vi.mock("@/features/library/api", async importActual => ({ ...await importActual<typeof import("@/features/library/api")>(), getSongDetail: mocks.detail }));
vi.mock("@/features/drive/api", async importActual => ({ ...await importActual<typeof import("@/features/drive/api")>(), getCloudConnections: mocks.connections }));
import { SongDetailPage } from "./song-detail-page";

function NavigateSong() {
  const navigate = useNavigate();
  return <><button onClick={() => navigate("/library/songs/second")}>Next song</button><SongDetailPage /></>;
}
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/library/songs/first"]}>
    <Routes><Route path="/library/songs/:songId" element={<NavigateSong />} /></Routes>
  </MemoryRouter></QueryClientProvider>);
}
beforeEach(() => { vi.clearAllMocks(); mocks.connections.mockResolvedValue([]); });
afterEach(cleanup);
describe("imported song navigation", () => {
  it("shows loading, never unavailable, while each new song is being fetched", async () => {
    let finish!: (value: unknown) => void;
    mocks.detail.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    setup();
    expect(screen.getByRole("status").textContent).toContain("Loading song");
    expect(screen.queryByText("Song unavailable")).toBeNull();
    await act(async () => finish({ song: { ...demoSongs[0], id: "first", title: "First imported song" }, assets: [], versions: [] }));
    expect(await screen.findByDisplayValue("First imported song")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Next song"));
    expect(screen.getByRole("status").textContent).toContain("Loading song");
    expect(screen.queryByText("Song unavailable")).toBeNull();
  });
  it("does not carry the previous song's edited title into the next song", async () => {
    mocks.detail.mockImplementation(async id => ({ song: { ...demoSongs[0], id, title: id === "first" ? "First song" : "Second song" }, assets: [], versions: [] }));
    setup();
    fireEvent.change(await screen.findByDisplayValue("First song"), { target: { value: "Unsaved first title" } });
    fireEvent.click(screen.getByText("Next song"));
    expect(await screen.findByDisplayValue("Second song")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Unsaved first title")).toBeNull();
  });
  it("offers a retry on a network error instead of claiming that the song is missing", async () => {
    mocks.detail.mockRejectedValueOnce(new Error("Network failed"));
    setup();
    expect(await screen.findByText("Could not load this song")).toBeInTheDocument();
    expect(screen.queryByText("Song unavailable")).toBeNull();
    mocks.detail.mockResolvedValue({ song: { ...demoSongs[0], id: "first", title: "Recovered song" }, assets: [], versions: [] });
    fireEvent.click(screen.getByText("Try again"));
    await waitFor(() => expect(screen.getByDisplayValue("Recovered song")).toBeInTheDocument());
  });
});
