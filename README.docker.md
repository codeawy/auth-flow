# Docker Setup for Auth Flow Nest.js Application

This document provides instructions for running the Auth Flow application using Docker.

## Prerequisites

- Docker
- Docker Compose

## Getting Started

### Development Environment

1. Copy the environment variables example file:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your specific configuration values.

3. Start the development environment:
   ```bash
   docker-compose up
   ```

   This will:
   - Build the Docker image for the application
   - Start a PostgreSQL database container
   - Run Prisma migrations
   - Start the Nest.js application in development mode

4. The application will be available at http://localhost:5001
   - API Documentation: http://localhost:5001/api/docs

### Production Build

To build and run the application for production:

1. Build the production image:
   ```bash
   docker build -t auth-flow-app:prod --target production .
   ```

2. Run the production container:
   ```bash
   docker run -p 5001:5001 --env-file .env auth-flow-app:prod
   ```

## Docker Compose Services

The `docker-compose.yml` file defines the following services:

- **app**: The Nest.js application
  - Runs in development mode with hot-reloading
  - Mounts the local codebase for real-time changes
  - Connects to the PostgreSQL database

- **postgres**: PostgreSQL database
  - Persists data in a Docker volume
  - Accessible on port 5432

## Environment Variables

See `.env.example` for a list of required environment variables.

## Database Migrations

Migrations are automatically applied when the container starts. To manually run migrations:

```bash
docker-compose exec app pnpm prisma migrate deploy
```

## Seeding the Database

To seed the database with initial data:

```bash
docker-compose exec app pnpm prisma db seed
```
