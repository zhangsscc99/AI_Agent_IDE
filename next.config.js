/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker 部署需要 standalone 输出
  output: process.env.DOCKER === 'true' ? 'standalone' : undefined,
  webpack: (config, { isServer }) => {
    // 客户端构建时，忽略 Node.js 模块
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    // 服务端构建时，将 ChromaDB 及其依赖标记为外部
    if (isServer) {
      // 保存原有的 externals 配置
      const originalExternals = config.externals;
      
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals].filter(Boolean)),
        // 添加 ChromaDB 相关模块为外部依赖
        ({ request }, callback) => {
          if (!request) return callback();
          
          // 检查是否是 ChromaDB 相关模块
          if (
            request === 'chromadb' ||
            request.startsWith('chromadb/') ||
            request === '@chroma-core/default-embed' ||
            request.startsWith('@chroma-core/')
          ) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        }
      ];
    }
    
    return config;
  },
  // 优化配置
  compress: true,
  poweredByHeader: false,
}

module.exports = nextConfig


