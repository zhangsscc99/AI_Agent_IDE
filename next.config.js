/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker 部署需要 standalone 输出
  output: process.env.DOCKER === 'true' ? 'standalone' : undefined,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
  // 优化配置
  compress: true,
  poweredByHeader: false,
}

module.exports = nextConfig


