#!/bin/bash

# AI IDE Agent 部署脚本

set -e

echo "🚀 开始部署 AI IDE Agent..."

# 检查 Node.js 版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ 错误: 需要 Node.js 20 或更高版本"
  exit 1
fi

echo "✅ Node.js 版本检查通过: $(node -v)"

# 检查环境变量
if [ -z "$GLM_API_KEY" ]; then
  echo "⚠️  警告: GLM_API_KEY 未设置"
  read -p "请输入 GLM_API_KEY: " GLM_API_KEY
  export GLM_API_KEY
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建项目
echo "🔨 构建项目..."
npm run build

# 检查构建结果
if [ ! -d ".next" ]; then
  echo "❌ 构建失败"
  exit 1
fi

echo "✅ 构建成功"

# 选择部署方式
echo ""
echo "请选择部署方式:"
echo "1) PM2 (推荐服务器)"
echo "2) Docker"
echo "3) 直接运行"
read -p "请输入选项 (1-3): " choice

case $choice in
  1)
    echo "🚀 使用 PM2 部署..."
    npm install -g pm2
    pm2 start ecosystem.config.js
    pm2 save
    echo "✅ 部署完成！使用 'pm2 logs ai-ide-agent' 查看日志"
    ;;
  2)
    echo "🐳 使用 Docker 部署..."
    docker-compose up -d
    echo "✅ 部署完成！使用 'docker-compose logs -f' 查看日志"
    ;;
  3)
    echo "▶️  直接运行..."
    npm start
    ;;
  *)
    echo "❌ 无效选项"
    exit 1
    ;;
esac

echo ""
echo "🎉 部署完成！"
echo "访问: http://localhost:3000"

