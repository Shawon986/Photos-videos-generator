/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma and other native/server packages must stay external to the bundler.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
