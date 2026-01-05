<div align="center">

# NestJS Template Microservice

**Production-ready NestJS microservice with Redis Streams, Prisma, health
checks, and metrics**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-22+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9+-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://prisma.io)
[![Redis](https://img.shields.io/badge/Redis-Streams-DC382D?logo=redis&logoColor=white)](https://redis.io)

Part of the [@teo-garcia/templates](https://github.com/teo-garcia/templates)
ecosystem

</div>

---

## Features

| Category          | Technologies                                                 |
| ----------------- | ------------------------------------------------------------ |
| **Framework**     | NestJS 11 with modular architecture                          |
| **Database**      | Prisma ORM with PostgreSQL                                   |
| **Messaging**     | Redis Streams for event-driven communication                 |
| **Resilience**    | Consumer groups, automatic retries, dead letter queues       |
| **Observability** | Health checks, Prometheus metrics, structured logging        |
| **Type Safety**   | TypeScript with strict mode                                  |
| **Testing**       | Jest for unit and E2E tests (with mocks, no Docker required) |
| **Code Quality**  | ESLint, Prettier, Husky, Commitlint                          |
| **DevOps**        | Docker, GitHub Actions CI/CD                                 |

---

## Requirements

- Node.js 22+
- pnpm 9+
- Docker & Docker Compose
- Redis (required for messaging)
- PostgreSQL (required for persistence)

---

## Quick Start

```bash
# 1. Clone the template
npx degit teo-garcia/nest-template-microservice my-service
cd my-service

# 2. Install dependencies
pnpm install

# 3. Setup environment
cp .env.example .env
# Edit .env if needed (defaults work for local development)

# 4. Start infrastructure (Redis + PostgreSQL)
docker-compose up -d

# 5. Setup database
pnpm db:generate
pnpm db:migrate

# 6. Start development server
pnpm start:dev
```

Open [http://localhost:3000/api](http://localhost:3000/api) - you should see
service info

Open [http://localhost:3000/health](http://localhost:3000/health) - health check
status

Open [http://localhost:3000/metrics](http://localhost:3000/metrics) - Prometheus
metrics

---

## Available Scripts

| Command            | Description                    |
| ------------------ | ------------------------------ |
| `pnpm start:dev`   | Start with hot reload          |
| `pnpm build`       | Create production build        |
| `pnpm start:prod`  | Run production server          |
| `pnpm test`        | Run unit tests                 |
| `pnpm test:e2e`    | Run E2E tests                  |
| `pnpm test:cov`    | Run tests with coverage        |
| `pnpm lint:es`     | Lint and fix with ESLint       |
| `pnpm lint:ts`     | TypeScript type checking       |
| `pnpm format`      | Format with Prettier           |
| `pnpm db:migrate`  | Run database migrations        |
| `pnpm db:generate` | Generate Prisma client         |
| `pnpm db:studio`   | Open Prisma Studio             |
| `pnpm db:deploy`   | Deploy migrations (production) |

---

## Testing

```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Run with coverage
pnpm test:cov
```

**Test Coverage:**

- **Unit tests**: Business logic with mocked dependencies
- **E2E tests**: Full API flow with mocked Redis and in-memory database
- **No Docker required**: Tests use mocks for fast CI/CD execution

All tests run without external dependencies (Redis/PostgreSQL are mocked).

---

## Health & Observability

### Health Checks

- `GET /health/live` - Liveness probe (returns 200 if app is running)
- `GET /health/ready` - Readiness probe (checks Redis + Database connectivity)
- `GET /health` - Comprehensive health status with memory metrics

### Metrics

- `GET /metrics` - Prometheus metrics endpoint
  - HTTP request count by route/method/status
  - HTTP request duration histograms
  - Memory usage metrics

### Logging

- Structured JSON logs via Winston
- Daily log rotation
- Request ID tracking for distributed tracing
- Log levels: `debug`, `info`, `warn`, `error`

---

## Architecture Notes

### Service Model

- Single service intended to run independently
- Communication is via events, not direct calls
- Redis Streams is required for messaging

### Event-Driven Architecture

This template implements event-driven patterns using Redis Streams:

### Publishing Events

When tasks are created, updated, or deleted, events are automatically published:

- `tasks:created` - New task created
- `tasks:updated` - Task fields modified
- `tasks:status_changed` - Task status changed
- `tasks:deleted` - Task deleted

### Consuming Events

Services can subscribe to events with automatic retry and error handling:

- Consumer groups for load balancing across instances
- Automatic retry (up to 3 attempts) on failure
- Dead letter queue for permanently failed messages
- Graceful shutdown with pending message acknowledgment

For detailed architecture patterns and beginner guidance, see
[ARCHITECTURE.md](ARCHITECTURE.md).

---

## Deployment

### Docker

```bash
# Build production image
docker build -f docker/Dockerfile -t my-service:latest .

# Run with docker-compose
docker-compose up -d

# Check logs
docker-compose logs -f app
```

## Environment Variables

Key configuration (see `.env.example` for full list):

| Variable          | Description                    | Default        |
| ----------------- | ------------------------------ | -------------- |
| `SERVICE_NAME`    | Service identifier for tracing | `microservice` |
| `PORT`            | Application port               | `3000`         |
| `DATABASE_URL`    | PostgreSQL connection string   | Required       |
| `REDIS_HOST`      | Redis server host              | `localhost`    |
| `REDIS_PORT`      | Redis server port              | `6379`         |
| `LOG_LEVEL`       | Logging verbosity              | `info`         |
| `METRICS_ENABLED` | Enable Prometheus metrics      | `true`         |

---

## Shared Configuration Packages

This template uses shared configs from the @teo-garcia ecosystem:

- [@teo-garcia/eslint-config-shared](https://github.com/teo-garcia/eslint-config-shared) -
  ESLint rules
- [@teo-garcia/prettier-config-shared](https://github.com/teo-garcia/prettier-config-shared) -
  Prettier formatting
- [@teo-garcia/tsconfig-shared](https://github.com/teo-garcia/tsconfig-shared) -
  TypeScript configuration
- [@teo-garcia/vitest-config-shared](https://github.com/teo-garcia/vitest-config-shared) -
  Vitest configuration

---

## Related Templates

- [nest-template-monolith](https://github.com/teo-garcia/nest-template-monolith) -
  Traditional NestJS REST API
- [react-template-next](https://github.com/teo-garcia/react-template-next) -
  Next.js frontend
- [react-template-rr](https://github.com/teo-garcia/react-template-rr) - React
  Router SPA

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

---

## License

MIT - see [LICENSE](LICENSE)

---

<div align="center">
  <sub>Built by <a href="https://github.com/teo-garcia">teo-garcia</a></sub>
</div>
