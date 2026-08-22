import { useEffect, useState } from "react";
import { Download } from "lucide-react";

export function ReleaseQrCode({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void import("qrcode")
      .then(({ toDataURL }) =>
        toDataURL(url, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 320,
          color: {
            dark: "#160d27ff",
            light: "#f7f0ffff",
          },
        }),
      )
      .then((nextDataUrl) => {
        if (active) {
          setDataUrl(nextDataUrl);
        }
      })
      .catch(() => {
        if (active) {
          setDataUrl(null);
        }
      });

    return () => {
      active = false;
    };
  }, [url]);

  if (!dataUrl) {
    return (
      <div
        className="aspect-square w-40 animate-pulse rounded-[24px] border border-border bg-surface-soft"
        aria-label="Generating release QR code"
      />
    );
  }

  return (
    <div className="w-40">
      <a
        className="group relative block w-40 overflow-hidden rounded-[24px] border border-accent/25 bg-[#f7f0ff] p-2 shadow-[0_18px_42px_rgba(var(--accent-rgb),0.2)] transition-[transform,box-shadow] hover:scale-[1.02] hover:shadow-[0_22px_52px_rgba(var(--accent-rgb),0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        href={dataUrl}
        download={`${title.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "mxtrove-release"}-qr.png`}
        aria-label={`Save QR code for ${title}`}
        title="Save QR code"
      >
        <img
          className="aspect-square w-full rounded-[17px]"
          src={dataUrl}
          alt={`QR code linking to ${title} on MxTrove`}
        />
        <span className="absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-full border border-white/20 bg-[#160d27]/90 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Download className="size-4" aria-hidden="true" />
        </span>
      </a>
      <p className="mt-2 text-center text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
        Click to save
      </p>
    </div>
  );
}
