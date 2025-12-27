# NestJS Template Microservice

NestJS microservice starter with Redis Streams messaging and a minimal event flow example.

## Use when

- You need messaging or event-driven workflows
- You want a service that can scale independently

## Requirements

- Node.js 22+
- pnpm 9+
- Docker and Docker Compose
- PostgreSQL
- Redis

## Quick start

```bash
npx degit teo-garcia/nest-template-microservice my-service
cd my-service
pnpm install
cp .env.example .env
docker-compose up -d
pnpm db:generate
pnpm db:migrate
pnpm start:dev
```

## Environment

Use `.env.example` as the single source for required variables.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm start:dev` | Start with hot reload |
| `pnpm build` | Build for production |
| `pnpm start:prod` | Run production server |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run E2E tests |
| `pnpm lint:es` | ESLint with fixes |
| `pnpm lint:ts` | TypeScript type checking |
| `pnpm format` | Prettier format |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:generate` | Generate Prisma client |

## Endpoints

- `GET /api` service info
- `GET /health` health status
- `GET /metrics` Prometheus metrics

## License

MIT
