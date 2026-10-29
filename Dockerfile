FROM node:22-slim AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build
RUN pnpm --filter backend deploy --prod --legacy /out/backend \
  && mkdir -p /out/frontend/azimeclient \
  && cp -r frontend/azimeclient/dist /out/frontend/azimeclient/dist

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out .
CMD ["node", "backend/dist/index.js"]
