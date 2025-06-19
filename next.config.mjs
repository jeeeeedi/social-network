/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Improve chunk loading stability
  experimental: {
    optimizePackageImports: ['@radix-ui/react-avatar', '@radix-ui/react-dropdown-menu', 'lucide-react'],
  },
  // Prevent chunk loading timeouts
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 1,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
        },
      };
    }
    return config;
  },
  // Improve development experience
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
}

export default nextConfig 