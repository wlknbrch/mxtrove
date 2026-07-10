function toDataUri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createArtworkDataUri(title: string, accent = "#ff6b5d") {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#12090d" />
          <stop offset="45%" stop-color="${accent}" />
          <stop offset="100%" stop-color="#2bd0d5" />
        </linearGradient>
        <radialGradient id="glow" cx="48%" cy="32%" r="40%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.92)" />
          <stop offset="50%" stop-color="rgba(255,255,255,0.14)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="56" fill="url(#bg)" />
      <circle cx="320" cy="158" r="122" fill="url(#glow)" opacity="0.95" />
      <circle cx="332" cy="164" r="108" fill="none" stroke="rgba(255,255,255,0.24)" stroke-width="2" />
      <path d="M0 412C96 368 196 388 272 328C324 287 368 239 436 226C472 220 492 228 512 240V512H0Z" fill="rgba(8,8,12,0.72)" />
      <rect x="92" y="194" width="2" height="160" rx="1" fill="rgba(255,255,255,0.14)" />
      <circle cx="93" cy="318" r="22" fill="rgba(255,255,255,0.12)" />
      <text x="44" y="468" fill="rgba(255,255,255,0.88)" font-family="Space Grotesk, sans-serif" font-size="34" font-weight="700">${title}</text>
    </svg>
  `;

  return toDataUri(svg);
}

export function createAvatarDataUri(label: string, accent = "#2bd0d5") {
  const safe = label.slice(0, 2).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#17171b" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="64" fill="url(#grad)" />
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Space Grotesk, sans-serif" font-size="44" font-weight="700">${safe}</text>
    </svg>
  `;

  return toDataUri(svg);
}

export const silentPreviewDataUri =
  "data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
