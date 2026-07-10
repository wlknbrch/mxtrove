import { useEffect, useMemo, useState, type ImgHTMLAttributes } from "react";

import { useResolvedMediaUrl } from "@/hooks/use-resolved-media-url";

type ResolvedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | string[] | null;
};

function normalizeCandidates(input: string | string[] | null | undefined) {
  const values = Array.isArray(input) ? input : input ? [input] : [];
  return values.filter((value, index, entries): value is string => Boolean(value) && entries.indexOf(value) === index);
}

export function ResolvedImage({
  src,
  alt,
  onError,
  ...props
}: ResolvedImageProps) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const filteredCandidates = useMemo(
    () => normalizeCandidates(src).filter((candidate) => !failedSources.includes(candidate)),
    [failedSources, src],
  );
  const resolvedSrc = useResolvedMediaUrl(filteredCandidates, "image");
  const activeCandidate = filteredCandidates[0] ?? null;

  useEffect(() => {
    setFailedSources([]);
  }, [src]);

  if (!resolvedSrc) {
    return null;
  }

  return (
    <img
      {...props}
      src={resolvedSrc}
      alt={alt}
      onError={(event) => {
        setFailedSources((current) =>
          activeCandidate && !current.includes(activeCandidate) ? [...current, activeCandidate] : current,
        );
        onError?.(event);
      }}
    />
  );
}
