FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Development stage
FROM base AS development
# Install all dependencies (including devDependencies)
RUN pnpm install
# Copy the rest of the application
COPY . .
# Generate Prisma client
RUN pnpm prisma generate
# Expose port
EXPOSE ${PORT}
# Start the application in development mode
CMD ["pnpm", "start:dev"]

# Build stage
FROM base AS build
# Install all dependencies
RUN pnpm install
# Copy the rest of the application
COPY . .
# Generate Prisma client
RUN pnpm prisma generate
# Build the application
RUN pnpm build
# Remove development dependencies
RUN pnpm prune --prod

# Production stage
FROM base AS production
# Set NODE_ENV to production
ENV NODE_ENV=production
# Copy built application from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
# Copy Prisma schema and migrations
COPY --from=build /app/prisma ./prisma
# Copy templates directory for email templates
COPY --from=build /app/src/templates ./src/templates
# Expose port
EXPOSE ${PORT}
# Start the application in production mode
CMD ["node", "dist/main"]
