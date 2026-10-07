# 阶段 1: 构建 React Web 前端
FROM node:20-alpine AS builder
WORKDIR /app

# 安装依赖
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY enjoy/package.json ./enjoy/package.json
COPY 1000-hours/package.json ./1000-hours/package.json
COPY 1000h-portal/package.json ./1000h-portal/package.json
COPY server/package.json ./server/package.json

RUN yarn install

# 复制源码并构建前端
COPY . .
WORKDIR /app/enjoy
RUN npx vite build --outDir ../dist

# 阶段 2: 运行轻量生产镜像
FROM node:20-alpine
WORKDIR /app

COPY server/package.json ./
RUN npm install --production

COPY server/ ./
COPY --from=builder /app/dist /app/dist

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
