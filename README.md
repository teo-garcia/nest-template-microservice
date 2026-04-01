<div align="center">

# NestJS Template Microservice

**Event-driven NestJS microservice with Redis Streams, Prisma, and production
observability**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-24+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10+-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://prisma.io)

Part of the [@teo-garcia/templates](https://github.com/teo-garcia/templates)
ecosystem

</div>

---

## Features

| Category          | Technologies                                          |
| ----------------- | ----------------------------------------------------- |
| **Framework**     | NestJS 11 with event-driven architecture              |
| **Messaging**     | Redis Streams with consumer groups and retry          |
| **Database**      | Prisma ORM with PostgreSQL                            |
| **Observability** | Health checks, Prometheus metrics, structured logging |
| **Type Safety**   | TypeScript with strict mode                           |
| **Testing**       | Jest for unit and E2E tests (no Docker required)      |
| **Code Quality**  | ESLint, Prettier, Husky, commitlint                   |
| **DevOps**        | Docker, GitHub Actions CI/CD                          |

---

## Requirements

- Node.js 24+
- pnpm 10+
- Docker and Docker Compose
- PostgreSQL
- Redis

---

## Quick Start

```bash
pnpm install
cp .env.example .env
cp .env.test.example .env.test
docker compose up -d db redis
pnpm db:generate
pnpm db:migrate
pnpm dev
```

The service starts on `http://localhost:3000`.

---

## Scripts

| Command            | Description                    |
| ------------------ | ------------------------------ |
| `pnpm dev`         | Start with hot reload          |
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
| `pnpm db:deploy`   | Deploy migrations (production) |

---

## Event-Driven Architecture

Events are published and consumed via Redis Streams:

| Event                  | Trigger              |
| ---------------------- | -------------------- |
| `tasks:created`        | New task created     |
| `tasks:updated`        | Task fields modified |
| `tasks:status_changed` | Task status changed  |
| `tasks:deleted`        | Task deleted         |

Consumer groups provide load balancing across instances. Failed messages retry
up to 3 times before moving to a dead letter queue. Graceful shutdown
acknowledges pending messages.

---

## Health and Observability

| Endpoint            | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `GET /health/live`  | Liveness probe                                       |
| `GET /health/ready` | Readiness probe (checks Redis + DB)                  |
| `GET /health`       | Full health summary with memory metrics              |
| `GET /metrics`      | Prometheus metrics (request count, duration, memory) |

Structured JSON logs via Winston with daily rotation and request ID tracking.

---

## Environment Variables

| Variable       | Description                    | Default        |
| -------------- | ------------------------------ | -------------- |
| `SERVICE_NAME` | Service identifier for tracing | `microservice` |
| `PORT`         | Application port               | `3000`         |
| `DATABASE_URL` | PostgreSQL connection string   | Required       |
| `REDIS_HOST`   | Redis server host              | `localhost`    |
| `REDIS_PORT`   | Redis server port              | `6379`         |
| `LOG_LEVEL`    | Logging verbosity              | `info`         |

See `.env.example` for the full list.

---

## Project Structure

| Path                  | Purpose                                                      |
| --------------------- | ------------------------------------------------------------ |
| `src/modules/tasks/`  | Sample task handlers, streams integration, and service logic |
| `src/shared/health/`  | Health checks and readiness probes                           |
| `src/shared/metrics/` | Prometheus instrumentation                                   |
| `src/config/`         | Environment, logger, and application config                  |
| `prisma/`             | Prisma schema and migrations                                 |
| `test/`               | E2E coverage                                                 |
| `docker/`             | Development and production container files                   |

---

## Shared Governance

| Area               | Tooling                                             |
| ------------------ | --------------------------------------------------- |
| Dependency updates | Renovate                                            |
| Issue intake       | GitHub issue templates                              |
| Change review      | Pull request template                               |
| CI                 | GitHub Actions for lint, typecheck, build, and test |
| Security           | Trivy, dependency review, and `pnpm audit`          |

---

## Shared Configs

| Package                              | Role                |
| ------------------------------------ | ------------------- |
| `@teo-garcia/eslint-config-shared`   | ESLint rules        |
| `@teo-garcia/prettier-config-shared` | Prettier formatting |
| `@teo-garcia/tsconfig-shared`        | TypeScript settings |

---

## Related Templates

| Template                        | Description               |
| ------------------------------- | ------------------------- |
| `nest-template-monolith`        | NestJS single-service API |
| `react-template-next`           | Next.js frontend          |
| `react-template-rr`             | React Router SPA          |
| `fastapi-template-microservice` | FastAPI equivalent        |

---

## License

MIT

---

<div align="center">
  <sub>Built by <a href="https://github.com/teo-garcia">teo-garcia</a></sub>
</div>
