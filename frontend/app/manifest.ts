import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MattySpins — Watch, play, and earn",
    short_name: "MattySpins",
    description:
      "Earn coins for watching the stream, compete on live leaderboards, play stream games, and redeem rewards.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0f14",
    theme_color: "#f59e0b",
    categories: ["entertainment", "games", "social"],
    icons: [
      { src: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { src: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/mattyspins-logo.png", sizes: "512x512", type: "image/png" },
    ],
    shortcuts: [
      { name: "Leaderboard", url: "/leaderboard" },
      { name: "Stream Games", url: "/stream-games" },
      { name: "Store", url: "/store" },
    ],
  };
}
