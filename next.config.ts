import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
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
  // Experimental features to help with path resolution
  experimental: {
    turbo: {
      resolveAlias: {
        '@/*': './src/*',
      },
    },
  },
  /* config options here */
};

export default nextConfig;
