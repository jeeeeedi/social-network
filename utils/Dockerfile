# FRONTEND Dockerfile for Next.js application

FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production image
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next .next
COPY --from=builder /app/public public
COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/next.config.mjs .
COPY --from=builder /app/tsconfig.json .
EXPOSE 3000

# `npm run dev` runs the development server (not optimized, not for production).
# CMD ["npm", "run", "dev"]

# `npx next start` or `npm run start` runs the optimized production build.
CMD ["npm", "run", "start"]