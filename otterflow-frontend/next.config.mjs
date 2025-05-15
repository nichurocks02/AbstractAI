/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1 — turn off eslint during `next build`
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // 2 — server-side rewrites so dev & prod both hit the FastAPI service **inside**
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:8000/:path*',        // <- http, not https
      },
      {
        source: '/uploaded_avatars/:path*',
        destination: 'http://backend:8000/uploaded_avatars/:path*',
      },
    ];
  },
};

export default nextConfig;

