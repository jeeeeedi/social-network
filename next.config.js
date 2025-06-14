/** @type {import('next').NextConfig} */
const nextConfig = {
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

module.exports = nextConfig