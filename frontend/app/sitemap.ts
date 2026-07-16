import type { MetadataRoute } from "next";

const SITE_URL = "https://mattyspins.com";

/**
 * Public, indexable routes only — anything behind Discord auth (/profile,
 * /notifications), the admin/moderator suite, and the OBS overlay widgets are
 * deliberately excluded and mirrored in robots.ts.
 *
 * `changeFrequency`/`priority` are hints: the live game + leaderboard routes
 * change constantly, the legal pages effectively never do.
 */
const ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1.0, changeFrequency: "daily" },
  { path: "/leaderboard", priority: 0.9, changeFrequency: "hourly" },
  { path: "/stream-games", priority: 0.9, changeFrequency: "daily" },
  { path: "/store", priority: 0.8, changeFrequency: "weekly" },
  { path: "/schedule", priority: 0.8, changeFrequency: "daily" },
  { path: "/weekly-raffle", priority: 0.8, changeFrequency: "daily" },
  { path: "/milestones", priority: 0.7, changeFrequency: "weekly" },
  { path: "/rewards", priority: 0.7, changeFrequency: "weekly" },
  { path: "/bonus-hunt", priority: 0.7, changeFrequency: "daily" },
  { path: "/raffle", priority: 0.6, changeFrequency: "daily" },
  { path: "/tournament", priority: 0.6, changeFrequency: "daily" },
  { path: "/king-of-the-hill", priority: 0.6, changeFrequency: "daily" },
  { path: "/high-roller", priority: 0.6, changeFrequency: "daily" },
  { path: "/boss-raid", priority: 0.6, changeFrequency: "daily" },
  { path: "/bounty-hunter", priority: 0.6, changeFrequency: "daily" },
  { path: "/bonus-bingo", priority: 0.6, changeFrequency: "daily" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/responsible-gaming", priority: 0.5, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
