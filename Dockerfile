# theGenEx frontend — single container, built and served with nginx.
#
# The backend lives entirely on Google Apps Script (see backend/) and is not
# part of this image — there is no server process to containerize there.
# This container only builds the static React site and serves it; every API
# call it makes at runtime goes to the Apps Script Web App URL baked in at
# build time via VITE_API_URL.

# ---- Build stage -----------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /app

# The pnpm workspace (frontend/pnpm-workspace.yaml) spans several packages
# under artifacts/* and lib/*, so `pnpm install` needs the whole workspace
# tree present (not just thegenex-site) to resolve workspace:* deps.
COPY frontend ./frontend

RUN corepack enable && corepack prepare pnpm@9 --activate
RUN cd frontend && pnpm install --frozen-lockfile=false

# VITE_API_URL is a build-time value for Vite (baked into the static JS
# bundle) — pass it as a Docker build arg, e.g.:
#   docker build --build-arg VITE_API_URL=https://script.google.com/... .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN cd frontend && \
    PORT=5000 BASE_PATH=/ NODE_ENV=production \
    pnpm --filter @workspace/thegenex-site run build

# ---- Runtime stage ----------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/frontend/artifacts/thegenex-site/dist/public /usr/share/nginx/html

# Render (and most PaaS) provide the listen port via $PORT; nginx's envsubst
# templating (built into the official image) renders it into the config.
ENV PORT=8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
