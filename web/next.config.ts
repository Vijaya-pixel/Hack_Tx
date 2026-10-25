import type { NextConfig } from 'next';

// /api/* goes to the backend, so the browser never makes a cross-origin request.
const backend = process.env.BACKEND_URL ?? 'http://localhost:4000';

const config: NextConfig = {
  devIndicators: false,
  turbopack: { root: process.cwd() },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
};
export default config;
