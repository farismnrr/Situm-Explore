# syntax=docker/dockerfile:1.7

FROM node:22.22.0-bookworm-slim AS base
WORKDIR /app

ARG OCI_SOURCE="https://github.com/farismnrr/situm-explore"
ARG OCI_REVISION="unknown"
ARG OCI_VERSION="dev"
LABEL org.opencontainers.image.source="${OCI_SOURCE}" \
      org.opencontainers.image.revision="${OCI_REVISION}" \
      org.opencontainers.image.version="${OCI_VERSION}"

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY app ./app
COPY server ./server
COPY shared ./shared
COPY drizzle ./drizzle
COPY public ./public
COPY nuxt.config.ts tsconfig.json eslint.config.mjs drizzle.config.ts ./
RUN npm run build

FROM dependencies AS migration
COPY drizzle ./drizzle
COPY server/db/schema.ts ./server/db/schema.ts
COPY drizzle.config.ts tsconfig.json ./
CMD ["npm", "run", "db:migrate"]

FROM node:22.22.0-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    NITRO_HOST=0.0.0.0 \
    PORT=3000 \
    NITRO_PORT=3000
ARG OCI_SOURCE="https://github.com/farismnrr/situm-explore"
ARG OCI_REVISION="unknown"
ARG OCI_VERSION="dev"
LABEL org.opencontainers.image.source="${OCI_SOURCE}" \
      org.opencontainers.image.revision="${OCI_REVISION}" \
      org.opencontainers.image.version="${OCI_VERSION}"
COPY --from=build /app/.output ./.output
RUN groupadd --system --gid 10001 nitro \
    && useradd --system --uid 10001 --gid nitro --no-create-home nitro \
    && chown -R nitro:nitro /app
USER nitro
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
