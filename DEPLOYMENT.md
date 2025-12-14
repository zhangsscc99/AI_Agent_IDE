# 🚀 部署指南

## 📋 部署方案对比

| 方案 | 难度 | 成本 | 适用场景 | 推荐度 |
|------|------|------|----------|--------|
| **Vercel** | ⭐ 简单 | 免费/付费 | 快速上线，小团队 | ⭐⭐⭐⭐⭐ |
| **Docker** | ⭐⭐ 中等 | 中等 | 需要容器化，多环境 | ⭐⭐⭐⭐ |
| **自建服务器** | ⭐⭐⭐ 复杂 | 低 | 完全控制，大项目 | ⭐⭐⭐ |

---

## 🎯 方案 1: Vercel 部署（推荐）

### ✅ 优点

- ✅ 零配置，一键部署
- ✅ 自动 HTTPS
- ✅ 全球 CDN
- ✅ 自动 CI/CD
- ✅ 免费额度充足

### ⚠️ 注意事项

- ⚠️ ChromaDB 需要持久化存储（Vercel 无状态）
- ⚠️ workspace 文件需要外部存储

### 📝 部署步骤

#### 1. 准备代码

```bash
# 确保代码已提交到 Git
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### 2. 创建 Vercel 项目

1. 访问 [vercel.com](https://vercel.com)
2. 使用 GitHub/GitLab 账号登录
3. 点击 "New Project"
4. 导入你的仓库
5. 配置项目：

**环境变量：**
```
GLM_API_KEY=你的GLM_API_KEY
LLM_API_KEY=你的GLM_API_KEY（如果不同）
WORKSPACE_PATH=workspace
NODE_ENV=production
```

**构建配置：**
- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

#### 3. 处理持久化存储

**方案 A：使用外部数据库（推荐）**

由于 Vercel 是无状态的，需要将 ChromaDB 迁移到外部存储：

```typescript
// 使用远程 ChromaDB 或向量数据库服务
// 例如：Pinecone, Weaviate, Qdrant Cloud
```

**方案 B：使用 Vercel KV / Postgres**

将索引数据存储到 Vercel 的数据库服务。

**方案 C：简化版（仅代码编辑，无 Embedding）**

如果暂时不需要 Codebase Embedding，可以：
- 移除 ChromaDB 依赖
- 禁用索引功能
- 只保留基础的文件编辑功能

#### 4. 部署

点击 "Deploy"，等待完成。

#### 5. 验证

访问 Vercel 提供的域名，测试功能。

---

## 🐳 方案 2: Docker 部署

### ✅ 优点

- ✅ 环境一致
- ✅ 易于扩展
- ✅ 支持持久化存储
- ✅ 可在任何平台运行

### 📝 部署步骤

#### 1. 创建 Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# 安装依赖
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 构建应用
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 运行应用
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

#### 2. 创建 docker-compose.yml

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - GLM_API_KEY=${GLM_API_KEY}
      - LLM_API_KEY=${LLM_API_KEY}
      - NODE_ENV=production
      - WORKSPACE_PATH=/app/workspace
    volumes:
      # 持久化 workspace 和 ChromaDB 数据
      - ./workspace:/app/workspace
      - ./data:/app/data
    restart: unless-stopped
```

#### 3. 创建 .dockerignore

```
node_modules
.next
.git
.env*.local
workspace
data
*.log
```

#### 4. 构建和运行

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 5. 访问

打开浏览器访问：`http://localhost:3000`

---

## 🖥️ 方案 3: 自建服务器部署

### ✅ 优点

- ✅ 完全控制
- ✅ 成本低
- ✅ 支持持久化存储
- ✅ 可自定义配置

### 📝 部署步骤

#### 1. 服务器要求

- **操作系统：** Ubuntu 20.04+ / CentOS 7+
- **Node.js：** v20.x
- **内存：** 至少 2GB
- **磁盘：** 至少 10GB（用于 workspace 和索引）

#### 2. 安装 Node.js

```bash
# Ubuntu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

#### 3. 安装 PM2（进程管理）

```bash
sudo npm install -g pm2
```

#### 4. 克隆项目

```bash
cd /var/www
git clone https://github.com/your-username/AI_Agent.git
cd AI_Agent
```

#### 5. 安装依赖

```bash
npm install --production
```

#### 6. 配置环境变量

```bash
# 创建 .env 文件
cat > .env << EOF
GLM_API_KEY=你的GLM_API_KEY
LLM_API_KEY=你的GLM_API_KEY
NODE_ENV=production
WORKSPACE_PATH=/var/www/AI_Agent/workspace
PORT=3000
EOF
```

#### 7. 构建项目

```bash
npm run build
```

#### 8. 启动服务

```bash
# 使用 PM2 启动
pm2 start npm --name "ai-ide-agent" -- start

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs ai-ide-agent
```

#### 9. 配置 Nginx（反向代理）

```bash
# 安装 Nginx
sudo apt-get install nginx

# 创建配置文件
sudo nano /etc/nginx/sites-available/ai-ide-agent
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/ai-ide-agent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 10. 配置 SSL（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 🔧 环境变量配置

### 必需变量

```bash
# GLM API Key（用于 LLM 和 Embedding）
GLM_API_KEY=你的GLM_API_KEY

# 如果 LLM 和 Embedding 使用不同的 key
LLM_API_KEY=你的LLM_API_KEY

# 工作空间路径（存储用户文件）
WORKSPACE_PATH=workspace

# Node 环境
NODE_ENV=production
```

### 可选变量

```bash
# 端口（默认 3000）
PORT=3000

# ChromaDB 持久化路径
CHROMA_DB_PATH=./data/chroma

# 最大文件大小（MB）
MAX_FILE_SIZE=10
```

---

## 📦 构建优化

### 1. 更新 next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Docker 部署需要
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
  // 优化构建
  compress: true,
  poweredByHeader: false,
  // 如果使用 Docker，启用 standalone
  ...(process.env.DOCKER === 'true' && {
    output: 'standalone',
  }),
}

module.exports = nextConfig
```

### 2. 优化 package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "docker:build": "DOCKER=true npm run build",
    "docker:start": "node server.js"
  }
}
```

---

## 🗄️ 持久化存储方案

### 问题

- ChromaDB 默认使用内存存储
- workspace 文件需要持久化
- Vercel 等无状态平台不支持本地文件系统

### 解决方案

#### 方案 A：使用外部向量数据库

```typescript
// 替换 ChromaDB 为云服务
// 例如：Pinecone, Weaviate, Qdrant Cloud

import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const index = pinecone.index('codebase');
```

#### 方案 B：使用对象存储（S3/OSS）

```typescript
// 将 workspace 文件存储到云存储
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
});
```

#### 方案 C：使用数据库

```typescript
// 将索引数据存储到 PostgreSQL + pgvector
// 将文件内容存储到数据库或对象存储
```

---

## 🔒 安全配置

### 1. 环境变量安全

- ✅ 不要在代码中硬编码 API Key
- ✅ 使用 `.env` 文件（不提交到 Git）
- ✅ 生产环境使用环境变量管理工具

### 2. API 限流

```typescript
// app/api/agent/chat/route.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
});

export async function POST(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
  
  // ... 原有逻辑
}
```

### 3. CORS 配置

```typescript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://your-domain.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
        ],
      },
    ];
  },
};
```

---

## 📊 监控和日志

### 1. 使用 PM2 监控

```bash
# 安装 PM2 监控
pm2 install pm2-logrotate

# 查看监控面板
pm2 monit
```

### 2. 集成 Sentry（错误追踪）

```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

### 3. 日志管理

```typescript
// lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

---

## 🧪 部署前检查清单

### 代码检查

- [ ] 所有依赖已安装
- [ ] TypeScript 编译无错误
- [ ] 环境变量已配置
- [ ] `.env` 文件已创建（不提交到 Git）
- [ ] `.gitignore` 配置正确

### 功能检查

- [ ] 本地构建成功：`npm run build`
- [ ] 本地运行正常：`npm start`
- [ ] API 接口正常
- [ ] 文件上传功能正常
- [ ] AI 对话功能正常

### 部署检查

- [ ] 服务器/平台已准备
- [ ] 域名已配置（如需要）
- [ ] SSL 证书已配置（如需要）
- [ ] 防火墙规则已配置
- [ ] 监控和日志已配置

---

## 🚨 常见问题

### Q1: 部署后无法访问？

**检查：**
1. 端口是否正确暴露
2. 防火墙是否允许
3. 服务是否正在运行
4. 环境变量是否正确

### Q2: ChromaDB 数据丢失？

**原因：** 内存存储，重启后丢失

**解决：** 使用持久化存储方案（见上方）

### Q3: 构建失败？

**检查：**
1. Node.js 版本（需要 v20+）
2. 内存是否充足（至少 2GB）
3. 依赖是否正确安装

### Q4: API 调用失败？

**检查：**
1. GLM_API_KEY 是否正确
2. 网络连接是否正常
3. API 配额是否充足

---

## 📚 推荐部署平台

### 免费/低成本

1. **Vercel** - Next.js 官方推荐
2. **Railway** - 简单易用
3. **Render** - 免费额度充足

### 生产环境

1. **AWS** - 完整云服务
2. **阿里云** - 国内访问快
3. **腾讯云** - 国内访问快

---

## 🎯 快速开始（推荐）

### 最简单：Vercel 部署

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel

# 4. 配置环境变量
vercel env add GLM_API_KEY
vercel env add LLM_API_KEY

# 5. 重新部署
vercel --prod
```

**完成！** 🎉

---

**准备好部署了吗？选择最适合你的方案开始吧！** 🚀

