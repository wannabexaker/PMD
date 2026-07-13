# Build stage pinned to the native builder arch: the Vite build emits static
# assets that are architecture-independent, so only the nginx runtime layer
# below needs to be materialised per target platform.
FROM --platform=$BUILDPLATFORM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
