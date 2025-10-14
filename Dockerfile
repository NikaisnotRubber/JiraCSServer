# 多阶段构建 - 减小最终镜像大小
FROM node:24-alpine AS base

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 设置工作目录
WORKDIR /app

# ============================================
# 依赖安装阶段
# ============================================
FROM base AS deps

# 复制依赖配置文件
COPY package.json pnpm-lock.yaml* ./

# 安装所有依赖（包括 devDependencies，用于构建）
RUN pnpm install --no-frozen-lockfile

# ============================================
# 构建阶段
# ============================================
FROM base AS builder

WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 构建 Next.js 应用
RUN pnpm build

# ============================================
# 运行阶段
# ============================================
FROM base AS runner

WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json

# 创建 public 目录（如果不存在）
RUN mkdir -p ./public

# 复制 src 目录（用于运行时导入）
COPY --from=builder /app/src ./src

# 设置文件权限
RUN chown -R nextjs:nodejs /app

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "server.js"]
