/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["cdn.discordapp.com", "kick.com"],
  },
  // Vercel manages output format — standalone is for self-hosting only
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      "https://website-production-ece1.up.railway.app",
  },
};

module.exports = nextConfig;
