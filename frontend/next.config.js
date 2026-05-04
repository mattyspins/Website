/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["cdn.discordapp.com", "kick.com"],
  },
  // Output standalone for better Vercel deployment
  output: "standalone",
};

module.exports = nextConfig;
