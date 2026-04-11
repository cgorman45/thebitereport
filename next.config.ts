import type { NextConfig } from "next";

import path from 'path';

const nextConfig: NextConfig = {
  serverExternalPackages: ['ws'],
  webpack: (config) => {
    // Fix react-map-gl/mapbox subpath import for production builds
    // Next.js webpack doesn't honor package.json "exports" for this subpath
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-map-gl/mapbox': path.join(process.cwd(), 'node_modules/react-map-gl/dist/mapbox.js'),
    };
    return config;
  },
};

export default nextConfig;
