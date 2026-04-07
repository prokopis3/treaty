FROM oven/bun:1.3.11 AS deps
WORKDIR /app
ENV HUSKY=0
ENV CI=1

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --ignore-scripts
RUN bun pm untrusted
RUN bun pm trust --all

FROM deps AS build
WORKDIR /app
ENV HUSKY=0
ENV CI=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build
RUN bun install --frozen-lockfile --production --ignore-scripts
RUN bun pm untrusted
RUN bun pm trust --all

FROM oven/bun:1.3.11 AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4201

COPY --from=build /app/package.json /app/bun.lockb ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server.ts ./server.ts
COPY --from=build /app/src ./src
COPY --from=build /app/treaty-utilities ./treaty-utilities
COPY --from=build /app/dist ./dist

EXPOSE 4201

CMD ["bun", "run", "server.ts"]
