/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["cdn.discordapp.com", "kick.com"],
  },
  // Output standalone for better Vercel deployment
  output: "standalone",
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      "https://website-production-ece1.up.railway.app",
  },
};

module.exports = nextConfig;
