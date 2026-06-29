# Deployment Guide

Phase 1 is ready for local Docker infrastructure and separate client/server builds.

## Local Infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL on `5432` and Redis on `6379`.

## Production Checklist

- Replace all JWT secrets with generated high-entropy values.
- Use managed PostgreSQL and Redis for production.
- Serve the client build through Nginx or a static hosting service.
- Run the server behind HTTPS with a reverse proxy.
- Set `NODE_ENV=production`.
- Restrict `CORS_ORIGIN` to the production client domain.
- Enable database backups and log retention.

## Build Commands

```bash
npm run build:client
npm run build:server
```

## AWS Direction

- Client: S3 + CloudFront or Amplify.
- API: ECS Fargate, Elastic Beanstalk, or EC2 with PM2.
- Database: RDS PostgreSQL.
- Cache: ElastiCache Redis.
- Secrets: AWS Secrets Manager or SSM Parameter Store.
