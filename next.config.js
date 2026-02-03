/**
 * @fileoverview Next.js configuration
 * Minimal config for Vercel deployment
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development warnings
  reactStrictMode: true,

  // Allow Spotify CDN images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        pathname: '/image/**',
      },
      {
        protocol: 'https',
        hostname: 'mosaic.scdn.co',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
