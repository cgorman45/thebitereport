import type { NextConfig } from "next";

import path from 'path';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const nextConfig: NextConfig = {
  serverExternalPackages: ['ws', 'cesium'],
  webpack: (config, { isServer, webpack }) => {
    // Fix react-map-gl/mapbox subpath import for production builds
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-map-gl/mapbox': path.join(process.cwd(), 'node_modules/react-map-gl/dist/mapbox.js'),
    };

    // CesiumJS: copy static assets to public/ and define base URL
    if (!isServer) {
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            { from: path.join(process.cwd(), 'node_modules/cesium/Build/Cesium/Workers'), to: '../public/Cesium/Workers' },
            { from: path.join(process.cwd(), 'node_modules/cesium/Build/Cesium/ThirdParty'), to: '../public/Cesium/ThirdParty' },
            { from: path.join(process.cwd(), 'node_modules/cesium/Build/Cesium/Assets'), to: '../public/Cesium/Assets' },
            { from: path.join(process.cwd(), 'node_modules/cesium/Build/Cesium/Widgets'), to: '../public/Cesium/Widgets' },
          ],
        }),
      );

      // CesiumJS compatibility
      config.module = config.module || {};
      config.module.unknownContextCritical = false;
    }

    config.plugins.push(
      new webpack.DefinePlugin({
        CESIUM_BASE_URL: JSON.stringify('/Cesium'),
      }),
    );

    return config;
  },
};

export default nextConfig;
