# Build stage pinned to the native builder arch: the Vite build emits static
# assets that are architecture-independent, so only the nginx runtime layer
# below needs to be materialised per target platform.
#
# The build CONTEXT is the repository root (see release.yml), not this directory,
# because the legal pages inline docs/legal/*.md at build time via ?raw. That
# folder lives outside frontend/pmd-frontend, so a frontend-only context cannot
# resolve the import and `npm run build` fails.
FROM --platform=$BUILDPLATFORM node:26-alpine AS build

WORKDIR /app/frontend/pmd-frontend
COPY frontend/pmd-frontend/package.json frontend/pmd-frontend/package-lock.json ./
RUN npm ci

# The app, then the legal Markdown it imports. docs/legal must land at /app/docs/legal
# so the pages' ../../../../../docs/legal/*.md?raw import resolves exactly as it does locally.
COPY frontend/pmd-frontend/ ./
COPY docs/legal/ /app/docs/legal/
RUN npm run build

FROM nginx:1.27-alpine

COPY frontend/pmd-frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/pmd-frontend/dist /usr/share/nginx/html

EXPOSE 80
