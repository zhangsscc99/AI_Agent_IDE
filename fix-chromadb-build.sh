#!/bin/bash

# ChromaDB 构建错误快速修复脚本
# 用于修复服务器上的 "Module not found: Can't resolve '@chroma-core/default-embed'" 错误

set -e

echo "🔧 开始修复 ChromaDB 构建错误..."

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
  echo "❌ 错误: 请在项目根目录运行此脚本"
  exit 1
fi

# 备份当前的 next.config.js
if [ -f "next.config.js" ]; then
  cp next.config.js next.config.js.backup
  echo "✅ 已备份 next.config.js"
fi

# 检查 next.config.js 是否包含 ChromaDB 配置
if grep -q "chromadb" next.config.js 2>/dev/null; then
  echo "✅ next.config.js 已包含 ChromaDB 配置"
else
  echo "⚠️  next.config.js 缺少 ChromaDB 配置，正在更新..."
  
  # 创建修复后的 next.config.js
  cat > next.config.js << 'EOF'
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
EOF
  echo "✅ 已更新 next.config.js"
fi

# 确保依赖已安装
echo "📦 检查依赖..."
if [ ! -d "node_modules" ]; then
  echo "安装依赖..."
  npm install
else
  echo "✅ 依赖已安装"
fi

# 清理之前的构建
if [ -d ".next" ]; then
  echo "🧹 清理旧的构建文件..."
  rm -rf .next
fi

# 重新构建
echo "🔨 开始构建..."
npm run build

if [ -d ".next" ]; then
  echo ""
  echo "✅ 构建成功！"
  echo "现在可以运行: npm start 或 pm2 start ecosystem.config.js"
else
  echo ""
  echo "❌ 构建失败，请检查错误信息"
  echo "如果问题仍然存在，请查看 DEPLOYMENT.md 中的故障排除部分"
  exit 1
fi

