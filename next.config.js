/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Force stable compilation
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  // Disable webpack cache to prevent client reference issues
  webpack: (config, { isServer, dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
