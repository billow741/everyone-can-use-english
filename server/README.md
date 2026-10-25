# SunnyBridge Backend Architecture & Deployment Guide

## 1. 架构总览 (Overview)

SunnyBridge 采用前后端分离及双通道服务端架构：

```
                      +-----------------------------+
                      |   Nginx (43.153.210.165)    |
                      +--------------+--------------+
                                     |
              +----------------------+----------------------+
              |                                             |
   [https://app.sunnybridge.qzz.io]               [API 反向代理]
              |                                             |
     /var/www/sunnybridge-app                        /api/* & /ahoy/*
  (React Vite Web 单页前端)                                 |
                                             +--------------v--------------+
                                             |  Python Auth & API Service  |
                                             |  Port: 8001                 |
                                             |  File: /opt/sunnybridge-auth|
                                             |        /server.py           |
                                             |  Service: sunnybridge-auth  |
                                             +-----------------------------+
```

---

## 2. 核心服务端文件说明

### 2.1 `server/vps_server.py` (生产环境 Python 服务)
运行在腾讯云 VPS (`43.153.210.165:8001`) 上的核心微服务，负责：
- **微信小程序与网页授权** (`/api/auth/wechat/*`): 微信扫码登录、Code 换 Token、小程序静默授权
- **游客免登录体验** (`/api/auth/guest-login`、`/api/auth/me`)
- **39 自然拼读通关岛进度同步** (`/api/phonics/*`): 关卡解锁、星级评分、拼读闯关状态上报与拉取
- **牛津阅读树多媒体资源** (`/api/oxford/*`): 绘本分级数据、文字定位、MP3 录音流与双语翻译
- **生词本云同步** (`/api/vocabulary/*`): 单词记录、生词本状态同步
- **Edge Neural TTS 语音生成与缓存** (`/api/ai/tts`): 微软高品质英音/美音神经网络离线缓存
- **大模型 AI 助教网关** (`/api/ai/chat`): 聚合 Llama 3.2 Vision / DeepSeek / 通义等模型对话接口
- **线索转化与选课管理** (`/api/leads`、`/api/courses`、`/api/enrollments`)

### 2.2 `server/admin.html` (运营与学员管理后台)
- 运营端管理看板，提供学员学习数据查看、打卡记录、线索追踪与课程配置。

### 2.3 `server/server.js` (本地桌面端开发 Node 代理)
- 桌面端 (Electron) 本地离线开发时使用的 Express 轻量代理服务（端口 3000）。

---

## 3. 部署方式 (Deployment)

在 `deploy/` 目录下提供了全自动化一键部署脚本：

### 3.1 部署后端服务到 VPS
```bash
# 执行部署脚本（支持通过环境变量传入秘钥或密码）
python deploy/deploy_server_to_vps.py
```
该脚本会自动：
1. 通过 SFTP 将最新 `server/vps_server.py` 上传至 VPS 临时目录。
2. 覆盖 `/opt/sunnybridge-auth/server.py` 并保持权限一致。
3. 执行 `sudo systemctl restart sunnybridge-auth` 重启微服务。
4. 运行接口健康检查，验证 Edge TTS 及 API 响应。

### 3.2 部署前端 Web 到 VPS
```bash
# 1. 在 enjoy 目录打包前端
cd enjoy/enjoy
npm run build:web

# 2. 执行自动化打包上传
cd ../..
python enjoy/deploy/deploy_web_to_vps.py
```
该脚本会自动将 `dist-web` 打包为 `tar.gz` 上传至 `/var/www/sunnybridge-app` 并平滑重载 Nginx。
