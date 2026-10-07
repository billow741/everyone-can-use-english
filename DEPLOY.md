# 🚀 SunnyBridge Enjoy 在线版 VPS 一键部署指南

本项目已完全解耦为**纯 Web / 移动端自适应架构**，可一键部署至任何 Linux VPS（Ubuntu / Debian / CentOS / Almalinux），支持通过域名、微信内置浏览器（H5）、手机/iPad 浏览器或 PWA 添加到主屏幕访问。

---

## 📋 部署前准备

1. **一台 Linux VPS**（建议配置 1核 2G 或更高，带公网 IP）
2. **已安装 Docker 与 Docker Compose**
   - 如未安装，在 VPS 执行官方一键脚本：
     ```bash
     curl -fsSL https://get.docker.com | bash
     ```

---

## ⚡ 一键部署步骤

### 第一步：上传项目代码至 VPS
在 VPS 上的 `/opt` 或用户主目录下克隆或上传项目代码：
```bash
cd /opt
# 将本项目目录上传至 /opt/sunnybridge-enjoy
cd /opt/sunnybridge-enjoy
```

### 第二步：配置大模型 API 密钥
进入 `server` 目录，从模板复制生成 `.env` 配置文件：
```bash
cd server
cp .env.example .env
nano .env   # 或 vim .env
```
填写您的 AI 配置（兼容任何 OpenAI 格式接口，如 DeepSeek、ChatGPT、通义千问等）：
```env
PORT=3000
AI_BASE_URL=https://api.deepseek.com
AI_API_KEY=sk-your-actual-api-key-here
AI_MODEL=deepseek-chat
```

### 第三步：一键构建并启动 Docker 容器
回到 `deploy` 目录，执行拉起命令：
```bash
cd ../deploy
docker compose up -d --build
```

查看运行状态：
```bash
docker compose ps
docker compose logs -f
```
当看到 `🚀 [SunnyBridge Enjoy] Online Backend is running on port 3000` 时，服务即已成功启动！

---

## 🌐 域名绑定与 HTTPS 访问（推荐）

微信浏览器与手机麦克风录音**强制要求 HTTPS**。配置 Nginx + 免费 SSL 证书步骤如下：

### 1. 配置 Nginx 反向代理
复制 `deploy/nginx.conf` 到系统 Nginx 配置目录：
```bash
sudo cp nginx.conf /etc/nginx/sites-available/sunnybridge.conf
sudo ln -s /etc/nginx/sites-available/sunnybridge.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. 申请免费 Let's Encrypt SSL 证书
使用 certbot 一键自动配置 HTTPS：
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

配置完成后，用户在微信或手机浏览器访问 `https://your-domain.com`，即可体验完整的伴学主页、桥宝 AI 陪练与语音纠音！
