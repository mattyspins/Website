/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // remotePatterns replaces the deprecated `domains` key and is stricter:
    // it pins protocol + path, so a compromised host can't serve from any path.
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com", pathname: "/**" },
      { protocol: "https", hostname: "kick.com", pathname: "/**" },
      { protocol: "https", hostname: "files.kick.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  // Vercel manages output format — standalone is for self-hosting only
  //
  // Both suppressions below were previously `true`, which let type errors and
  // lint violations ship to production silently. The tree is clean, so the
  // build now fails on regressions instead of hiding them.
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  env: {
    // Must stay same-site with the frontend (mattyspins.com): the auth cookies
    // are SameSite=lax, so a foreign API domain is never sent them and every
    // authenticated request 401s. See backend middleware/auth.ts.
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "https://api.mattyspins.com",
  },
};

module.exports = nextConfig;
