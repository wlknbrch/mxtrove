import { useEffect, useState } from "react";

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
    <a
      className="group block w-40 overflow-hidden rounded-[24px] border border-accent/25 bg-[#f7f0ff] p-2 shadow-[0_18px_42px_rgba(var(--accent-rgb),0.2)] transition-transform hover:scale-[1.02]"
      href={dataUrl}
      download={`${title.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "mxshare-release"}-qr.png`}
      aria-label={`Download QR code for ${title}`}
    >
      <img
        className="aspect-square w-full rounded-[17px]"
        src={dataUrl}
        alt={`QR code linking to ${title} on MxShare`}
      />
    </a>
  );
}
