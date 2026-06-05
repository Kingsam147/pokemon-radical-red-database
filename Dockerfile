FROM node:24-alpine AS base

WORKDIR /app/Backend

COPY Backend/package.json ./

RUN npm install --omit=dev --ignore-scripts

COPY Backend/ ./

EXPOSE 3500

CMD ["node", "server.js"]
