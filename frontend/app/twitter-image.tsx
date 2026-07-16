// Twitter/X reads the same card as Open Graph — the renderer is shared so the
// two can't diverge.
//
// These consts must be literals: Next statically analyses `runtime`/`size` at
// build time and silently falls back to the Node runtime if it can't read them
// (re-exporting them from another module is not recognised).
export const runtime = "edge";
export const alt = "MattySpins — Watch, play, and earn";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export { default } from "./opengraph-image";
