import { ImageResponse } from "next/og";

// Generated at request time on the edge, so the card can never drift out of sync
// with the brand the way a hand-exported PNG does. Twitter reuses this file via
// the twitter-image convention re-export below.
export const runtime = "edge";
export const alt = "MattySpins — Watch, play, and earn";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0b0f14",
          // Satori (the renderer behind ImageResponse) supports only a subset of
          // CSS gradients — the `<length> at <position>` radial syntax throws
          // "Missing comma before color stops". `circle at` with explicit stops
          // is the form it parses.
          backgroundImage:
            "radial-gradient(circle at 0% 0%, rgba(245,158,11,0.22) 0%, transparent 55%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            color: "#f59e0b",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "4px",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#f59e0b",
            }}
          />
          OFFICIAL RAZED PARTNER
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 128,
            fontWeight: 900,
            letterSpacing: "-4px",
            marginTop: 28,
            lineHeight: 1,
          }}
        >
          <span style={{ color: "#F5F7FA" }}>MATTY</span>
          <span style={{ color: "#f59e0b" }}>SPINS</span>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 42,
            color: "#9EA7B8",
            marginTop: 30,
            maxWidth: 900,
            lineHeight: 1.3,
          }}
        >
          Watch, play, and earn — turn stream time into rewards.
        </div>

        <div style={{ display: "flex", gap: "16px", marginTop: 48 }}>
          {["Live leaderboards", "Stream games", "Coin store"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                fontSize: 26,
                color: "#D8D8DD",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 999,
                padding: "12px 26px",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
