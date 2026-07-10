import { useEffect, useMemo, useState } from "react";
import { User2 } from "lucide-react";

import { useResolvedMediaUrl } from "@/hooks/use-resolved-media-url";
import { cn } from "@/lib/utils";

function normalizeCandidates(input: string | string[] | null | undefined) {
  const values = Array.isArray(input) ? input : input ? [input] : [];
  return values.filter((value, index, entries): value is string => Boolean(value) && entries.indexOf(value) === index);
}

export function Avatar({
  src,
  alt,
  initials,
  className,
}: {
  src?: string | string[] | null;
  alt: string;
  initials?: string;
  className?: string;
}) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const filteredCandidates = useMemo(
    () => normalizeCandidates(src).filter((candidate) => !failedSources.includes(candidate)),
    [failedSources, src],
  );
  const resolvedSrc = useResolvedMediaUrl(filteredCandidates, "image");
  const activeCandidate = filteredCandidates[0] ?? null;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setFailedSources([]);
  }, [src]);

  useEffect(() => {
    setImageFailed(false);
  }, [resolvedSrc]);

  return (
    <div
      className={cn(
        "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/20 bg-[radial-gradient(circle_at_top,rgba(157,92,255,0.22),rgba(255,255,255,0.04))] text-xs font-semibold text-muted-foreground shadow-[0_10px_28px_rgba(7,2,20,0.28)]",
        className,
      )}
    >
      {resolvedSrc && !imageFailed ? (
        <img
          className="size-full object-cover"
          src={resolvedSrc}
          alt={alt}
          onError={() => {
            setImageFailed(true);
            setFailedSources((current) =>
              activeCandidate && !current.includes(activeCandidate) ? [...current, activeCandidate] : current,
            );
          }}
        />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <User2 className="size-4" />
      )}
    </div>
  );
}
