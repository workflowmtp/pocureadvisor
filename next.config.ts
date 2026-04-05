import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
    // Enable optimizations
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
  images: { 
    domains: [],
    // Enable image optimization
    formats: ['image/avif', 'image/webp'],
  },
  // Enable strict mode for better performance
  reactStrictMode: true,
  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Headers for caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      // Cache static assets
      {
        source: '/favicon.ico',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
