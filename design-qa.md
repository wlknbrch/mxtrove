reference visual sources:
- /Users/wlknbrch/.codex/generated_images/019f3d4e-3d88-7fc2-9208-e603ab6ec279/ig_0f28705f8cf465d8016a4ed5c2b6248191b094343498c63349.png
- /Users/wlknbrch/.codex/generated_images/019f3d4e-3d88-7fc2-9208-e603ab6ec279/ig_0f28705f8cf465d8016a4ed74837b481918d1f9dae8711e724.png
- /Users/wlknbrch/.codex/generated_images/019f3d4e-3d88-7fc2-9208-e603ab6ec279/ig_0f28705f8cf465d8016a4ed6c7a9208191901721f276bb0423.png
- /Users/wlknbrch/.codex/generated_images/019f3d4e-3d88-7fc2-9208-e603ab6ec279/ig_0f28705f8cf465d8016a4ed7d34f9481919db7467c901e0cf1.png
- /Users/wlknbrch/.codex/generated_images/019f3d4e-3d88-7fc2-9208-e603ab6ec279/ig_0f28705f8cf465d8016a4ed78f8f048191ac6b55b6e649cf6a.png

third-pass screenshot evidence:
- /tmp/mxshare-third-pass-entry.png
- /tmp/mxshare-third-pass-home-auth-check.png
- /tmp/mxshare-third-pass-home-player.png
- /tmp/mxshare-third-pass-explore.png
- /tmp/mxshare-third-pass-messages.png

viewport:
- desktop Playwright viewport at 1600x1200

validated state:
- unauthenticated auth shell
- authenticated home feed
- authenticated home feed with fixed player visible
- authenticated explore route
- authenticated messages inbox

third-pass emphasis:
- tighten fidelity to Velvet Signal through atmosphere, light beams, shell richness, stronger editorial hero cards, and a more integrated fixed player

comparison notes:
- The shared shell now lands much closer to the mockups through the Velvet Signal badge, deeper beam lighting, stronger glass depth, and a richer sidebar rhythm.
- Home now reads as an editorial surface rather than a plain feed: the hero statement, metrics strip, spotlight sidebar, and more cinematic first card move it meaningfully toward the approved direction.
- Explore now shares the same design language as Home and Settings instead of feeling like a utilitarian filter page.
- Messages benefits from the stronger global shell and header system and now feels coherent beside the other redesigned routes.
- The fixed player is back to a native MxTrove surface and visually aligns far better with the mockups than the earlier utilitarian pass.

functional QA performed:
- `npm run typecheck`
- `npm run build`
- local authenticated Playwright flow against `http://127.0.0.1:4174`

residual notes:
- The screenshot run surfaced `This preview could not be played in the browser.` when triggering playback in Playwright. The player layout itself rendered correctly, but the underlying preview source still depends on the current media/browser compatibility of the test content.
- Some artwork surfaces in authenticated content still show fallback blocks when the underlying asset does not resolve into a renderable image during QA. That is a data/media pipeline issue, not a layout regression introduced by this design pass.

final result:
- third pass completed
- visual fidelity improved most on shell, home, explore, and player
