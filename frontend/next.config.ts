import type { NextConfig } from 'next';

const backend = (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://lms-backend-seven-pied.vercel.app/api' : 'http://localhost:4000/api')).replace(/\/$/, '');

const config: NextConfig = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backend}/:path*` }];
  },
};
export default config;
