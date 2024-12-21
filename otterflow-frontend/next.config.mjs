/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: 'http://frontend:3000/:path*', // Adjust this URL to your FastAPI server
      },
    ];
  },
};

export default nextConfig;

