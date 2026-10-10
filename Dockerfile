FROM node:24-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN node ace build

FROM base AS production
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3333
ENV CMS_UPDATES=docker
COPY --from=build /app/build ./
COPY --from=build /app/bin/docker-entrypoint ./bin/docker-entrypoint
RUN pnpm install --prod --frozen-lockfile
RUN mkdir -p storage
VOLUME /app/storage
EXPOSE 3333
ENTRYPOINT ["./bin/docker-entrypoint"]
CMD ["node", "bin/server.js"]
