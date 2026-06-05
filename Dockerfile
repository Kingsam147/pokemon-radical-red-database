FROM node:24-alpine AS base

WORKDIR /app

# Copy root and workspace manifests for layer caching
COPY package*.json ./
COPY Backend/package*.json ./Backend/
COPY Frontend/package*.json ./Frontend/

# Install all workspace dependencies
RUN npm ci

# Copy backend source
COPY Backend/ ./Backend/

EXPOSE 3500

CMD ["node", "Backend/server.js"]
