# ⚡ 快速部署指南

## 🎯 选择你的部署方式

### 方式 1: Vercel（最简单，5 分钟）⭐ 推荐

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel

# 4. 添加环境变量
vercel env add GLM_API_KEY
# 输入你的 GLM API Key

# 5. 生产环境部署
vercel --prod
```

**完成！** 访问 Vercel 提供的域名即可。

---

### 方式 2: Docker（推荐生产环境）

```bash
# 1. 创建 .env 文件
echo "GLM_API_KEY=你的key" > .env

# 2. 构建并启动
docker-compose up -d

# 3. 查看日志
docker-compose logs -f

# 4. 访问
# http://localhost:3000
```

**停止服务：**
```bash
docker-compose down
```

---

### 方式 3: 服务器部署（传统方式）

```bash
# 1. 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 安装 PM2
sudo npm install -g pm2

# 3. 克隆项目
cd /var/www
git clone https://github.com/your-username/AI_Agent.git
cd AI_Agent

# 4. 安装依赖
npm install --production

# 5. 创建 .env
cat > .env << EOF
GLM_API_KEY=你的key
NODE_ENV=production
PORT=3000
EOF

# 6. 构建
npm run build

# 7. 启动
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**访问：** `http://your-server-ip:3000`

---

## 🔑 必需的环境变量

```bash
GLM_API_KEY=你的GLM_API_KEY
```

**可选：**
```bash
LLM_API_KEY=你的LLM_API_KEY（如果不同）
WORKSPACE_PATH=workspace
PORT=3000
```

---

## ✅ 部署前检查

- [ ] 代码已提交到 Git
- [ ] `.env` 文件已创建（不提交到 Git）
- [ ] GLM_API_KEY 已配置
- [ ] 本地测试通过：`npm run build && npm start`

---

## 🚨 常见问题

### Q: Vercel 部署失败？

**A:** 检查：
1. 环境变量是否配置
2. Node.js 版本（需要 20+）
3. 构建日志中的错误信息

### Q: Docker 无法访问？

**A:** 检查：
1. 端口是否正确映射（3000:3000）
2. 防火墙是否允许
3. `docker-compose logs` 查看错误

### Q: 服务器部署后无法访问？

**A:** 检查：
1. PM2 进程是否运行：`pm2 status`
2. 端口是否开放：`sudo ufw allow 3000`
3. Nginx 配置是否正确

---

## 📚 详细文档

查看 `DEPLOYMENT.md` 获取完整的部署指南。

---

**选择最适合你的方式，开始部署吧！** 🚀

