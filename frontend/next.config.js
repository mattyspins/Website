/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ["cdn.discordapp.com", "kick.com"],
  },
};

module.exports = nextConfig;
