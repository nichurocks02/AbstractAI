/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://backend:8000/:path*', // Proxy API requests to FastAPI backend
      },
      {
        source: '/uploaded_avatars/:path*',
        destination: 'https://backend:8000/uploaded_avatars/:path*', // Proxy uploaded avatar requests
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true, // Ignore ESLint errors in production
  },
};

export default nextConfig;
