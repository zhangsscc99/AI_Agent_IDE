#!/bin/bash

# PM2 启动脚本
# 用于在构建成功后启动应用

set -e

echo "🚀 启动 AI IDE Agent..."

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
  echo "❌ 错误: 请在项目根目录运行此脚本"
  exit 1
fi

# 检查是否已构建
if [ ! -d ".next" ]; then
  echo "❌ 错误: 未找到 .next 目录，请先运行 'npm run build'"
  exit 1
fi

# 创建 logs 目录（如果不存在）
if [ ! -d "logs" ]; then
  mkdir -p logs
  echo "✅ 已创建 logs 目录"
fi

# 检查 PM2 是否已安装
if ! command -v pm2 &> /dev/null; then
  echo "📦 安装 PM2..."
  npm install -g pm2
fi

# 停止已存在的进程（如果存在）
if pm2 list | grep -q "ai-ide-agent"; then
  echo "🛑 停止现有进程..."
  pm2 stop ai-ide-agent
  pm2 delete ai-ide-agent
fi

# 启动应用
echo "▶️  启动应用..."
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

# 显示状态
echo ""
echo "✅ 启动完成！"
echo ""
echo "📊 查看状态:"
pm2 status

echo ""
echo "📝 查看日志:"
echo "  pm2 logs ai-ide-agent        # 实时日志"
echo "  pm2 logs ai-ide-agent --lines 100  # 最近100行"
echo ""
echo "🔧 其他常用命令:"
echo "  pm2 restart ai-ide-agent     # 重启"
echo "  pm2 stop ai-ide-agent        # 停止"
echo "  pm2 delete ai-ide-agent      # 删除"
echo "  pm2 monit                     # 监控面板"
echo ""
echo "🌐 应用地址: http://localhost:3000"

