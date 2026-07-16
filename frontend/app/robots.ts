import type { MetadataRoute } from "next";

const SITE_URL = "https://mattyspins.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Admin/moderator tooling, OBS overlay routes and the OAuth handoff have
        // no search value and shouldn't be indexed. The widget routes in
        // particular render transparent overlays that look broken in results.
        disallow: [
          "/admin/",
          "/moderator/",
          "/auth/",
          "/api/",
          "/bingo-widget/",
          "/bonus-hunt-widget/",
          "/tournament-widget/",
          "/picker-widget/",
          "/king-of-the-hill-widget/",
          "/high-roller-widget/",
          "/boss-raid-widget/",
          "/bounty-hunter-widget/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
