import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  skipMiddlewareUrlNormalize: true,
  webpack: (config, { isServer }) => {
    // Fix path resolution issues on Windows
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    // Force consistent casing for module resolution
    config.resolve.symlinks = false;
    
    return config;
  },
  // Turbopack configuration
  turbopack: {
    resolveAlias: {
      '@/*': './src/*',
    },
  },
  /* config options here */
};

export default nextConfig;