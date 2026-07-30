# syntax=docker/dockerfile:1

# ---- Build stage: compile the Astro static site -----------------------------
FROM node:22-slim AS build
WORKDIR /app

# Install deps against the lockfile first (cached unless package*.json changes).
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source and build.
COPY . .

# --- Airtable credentials (optional) -----------------------------------------
# With no credentials, content.config.ts falls back to src/data/*.json sample
# data, so the image builds and serves with zero secrets. These ARGs are only
# present in THIS build stage and are never copied into the final image.
# To publish live Airtable content, supply them at build time (see the Secret
# Manager note) — do NOT hard-code a real token here.
ARG AIRTABLE_TOKEN=""
ARG AIRTABLE_BASE=""
ARG AIRTABLE_VIEW="Grid view"
ENV AIRTABLE_TOKEN=$AIRTABLE_TOKEN \
    AIRTABLE_BASE=$AIRTABLE_BASE \
    AIRTABLE_VIEW=$AIRTABLE_VIEW

RUN npm run build

# ---- Serve stage: static files behind nginx ---------------------------------
FROM nginx:alpine AS serve
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Cloud Run's default port; nginx.conf listens on 8080 to match.
EXPOSE 8080
