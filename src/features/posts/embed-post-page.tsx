import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { usePlayerStore } from "@/components/audio/player-store";
import { MxShareMark } from "@/components/layout/mxshare-mark";
import { Button } from "@/components/ui/button";
import { ResolvedImage } from "@/components/ui/resolved-image";
import { getResolvedPostById } from "@/features/posts/api";
import { buildPostPlaybackTracks } from "@/features/posts/post-playback";
import { getArtworkAssetUrls } from "@/lib/asset-urls";

export function EmbedPostPage() {
  const { postId = "" } = useParams();
  const enqueue = usePlayerStore((state) => state.enqueue);
  const query = useQuery({
    queryKey: ["embed-post", postId],
    queryFn: () => getResolvedPostById(postId, null),
    enabled: Boolean(postId),
    retry: false,
  });
  const item = query.data;

  if (!item || item.post.visibility !== "public" || !item.post.allow_embed) {
    return <div className="flex min-h-screen items-center justify-center bg-background p-5 text-sm text-muted-foreground">This release cannot be embedded.</div>;
  }

  const tracks = buildPostPlaybackTracks(item);
  return (
    <div className="min-h-screen bg-background p-3 pb-32 text-foreground">
      <div className="glass-panel mx-auto grid max-w-3xl gap-4 rounded-[26px] border border-border p-4 sm:grid-cols-[130px_minmax(0,1fr)]">
        <ResolvedImage
          alt={item.post.title}
          src={getArtworkAssetUrls(item.artwork)}
          className="aspect-square w-full rounded-[20px] object-cover"
        />
        <div className="flex min-w-0 flex-col justify-center">
          <Link to={`/post/${item.post.id}`} target="_blank" className="truncate font-display text-3xl hover:text-accent-secondary">
            {item.post.title}
          </Link>
          <p className="mt-1 truncate text-sm text-muted-foreground">{item.owner?.display_name}</p>
          <div className="mt-4 flex items-center gap-3">
            <Button disabled={!tracks.length} onClick={() => enqueue(tracks, tracks[0]?.id)}>
              <Play className="size-4 fill-current" />
              Play
            </Button>
            <Link to={`/post/${item.post.id}`} target="_blank" className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <MxShareMark className="size-7" />
              MxTrove
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
