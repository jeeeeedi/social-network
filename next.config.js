import type { NextConfig } from 'next'
 
const nextConfig: NextConfig = {
  distDir: '.next',
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
    ]
  },
}
 
export default nextConfig