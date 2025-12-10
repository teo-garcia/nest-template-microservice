<div align="center">

# NestJS Template Microservice

**Production-ready NestJS microservice with Redis Streams, health checks, and metrics**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-22+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9+-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![Redis](https://img.shields.io/badge/Redis-Streams-DC382D?logo=redis&logoColor=white)](https://redis.io)

Part of the [@teo-garcia/templates](https://github.com/teo-garcia/templates) ecosystem

</div>

---

## Features

| Category          | Technologies                                          |
| ----------------- | ----------------------------------------------------- |
| **Framework**     | NestJS 11 with microservice architecture              |
| **Messaging**     | Redis Streams for event-driven communication          |
| **Database**      | Optional Prisma ORM with PostgreSQL                   |
| **Observability** | Health checks, Prometheus metrics, structured logging |
| **Resilience**    | Consumer groups, dead letter queues, auto-retry       |
| **Type Safety**   | TypeScript with strict mode                           |
| **DevOps**        | Docker, GitHub Actions CI/CD                          |

## Requirements

- Node.js 22+
- pnpm 9+
- Docker & Docker Compose
- Redis (required for messaging)

## Quick Start

```bash
# Clone the template
npx degit teo-garcia/nest-template-microservice my-service
cd my-service

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env

# Start infrastructure (Redis + optional PostgreSQL)
docker-compose up -d

# Generate Prisma client (if using database)
pnpm db:generate

# Start development server
pnpm start:dev
```

Open [http://localhost:3000](http://localhost:3000) to see your service.

## Project Structure

```
src/
├── config/                 # Service configuration with validation
├── modules/
│   └── tasks/              # Example domain module
│       ├── controllers/    # HTTP request handlers
│       ├── services/       # Business logic + event publishing
│       └── dto/            # Data transfer objects + events
└── shared/
    ├── filters/            # Global exception handling
    ├── health/             # Health checks (DB, Redis)
    ├── interceptors/       # Request/response transformation
    ├── logger/             # Structured logging (Winston)
    ├── messaging/          # Redis Streams pub/sub
    ├── metrics/            # Prometheus metrics
    └── prisma/             # Database client (optional)
```

## Example Module: Tasks

The template includes a complete `TasksModule` demonstrating:

- Full CRUD operations with Prisma
- Event publishing on create/update/delete
- Event consumption with consumer groups
- Input validation with class-validator

### API Endpoints

| Method | Endpoint         | Description                          |
| ------ | ---------------- | ------------------------------------ |
| POST   | `/api/tasks`     | Create a task (publishes event)      |
| GET    | `/api/tasks`     | List all tasks                       |
| GET    | `/api/tasks/:id` | Get a specific task                  |
| PATCH  | `/api/tasks/:id` | Update a task (publishes event)      |
| DELETE | `/api/tasks/:id` | Delete a task (publishes event)      |

### Task Schema

```prisma
model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  status      TaskStatus @default(PENDING)
  priority    Int        @default(0)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

## Messaging

### Publishing Events

When tasks are created, updated, or deleted, events are automatically published to Redis Streams:

```typescript
// Events are published automatically by TasksService
// Stream names: tasks:created, tasks:updated, tasks:deleted, tasks:status_changed
```

### Consuming Events

The `TaskConsumerService` demonstrates how to subscribe to events:

```typescript
await this.messageConsumer.subscribe<TaskEvent>(
  'tasks:created',
  'my-service-consumer',
  async (event) => {
    // React to task creation
    console.log(`Task created: ${event.taskId}`);
  },
);
```

### Event Types

| Stream                 | Description                 |
| ---------------------- | --------------------------- |
| `tasks:created`        | New task created            |
| `tasks:updated`        | Task fields modified        |
| `tasks:status_changed` | Task status changed         |
| `tasks:deleted`        | Task deleted                |

## Scripts

| Command            | Description              |
| ------------------ | ------------------------ |
| `pnpm start:dev`   | Start with hot reload    |
| `pnpm build`       | Create production build  |
| `pnpm start:prod`  | Run production server    |
| `pnpm test`        | Run unit tests           |
| `pnpm test:e2e`    | Run E2E tests            |
| `pnpm lint:es`     | Lint and fix with ESLint |
| `pnpm lint:ts`     | TypeScript type checking |
| `pnpm format`      | Format with Prettier     |
| `pnpm db:migrate`  | Run database migrations  |
| `pnpm db:generate` | Generate Prisma client   |

## Health & Metrics

| Endpoint            | Description                |
| ------------------- | -------------------------- |
| `GET /health`       | Full health status         |
| `GET /health/live`  | Kubernetes liveness probe  |
| `GET /health/ready` | Kubernetes readiness probe |
| `GET /metrics`      | Prometheus metrics         |

## Configuration

Environment variables are validated at startup. Key configuration:

| Variable           | Description                | Default     |
| ------------------ | -------------------------- | ----------- |
| `PORT`             | Application port           | 3000        |
| `SERVICE_NAME`     | Service identifier         | microservice|
| `DATABASE_URL`     | PostgreSQL connection URL  | Optional    |
| `DATABASE_ENABLED` | Enable database            | false       |
| `REDIS_HOST`       | Redis host                 | localhost   |
| `REDIS_PORT`       | Redis port                 | 6379        |
| `REDIS_PASSWORD`   | Redis password             | (none)      |
| `ENABLE_MESSAGING` | Enable Redis pub/sub       | false       |
| `LOG_LEVEL`        | Logging level              | info        |

## Docker Compose Profiles

```bash
# Basic (Redis only, no database)
docker-compose up

# With database
docker-compose --profile with-db up

# With UI tools (Redis Commander)
docker-compose --profile with-ui up

# Full stack
docker-compose --profile with-db --profile with-ui up
```

## Shared Configs

This template uses standardized configurations from the ecosystem:

- [`@teo-garcia/eslint-config-shared`](https://github.com/teo-garcia/eslint-config-shared) - ESLint rules
- [`@teo-garcia/prettier-config-shared`](https://github.com/teo-garcia/prettier-config-shared) - Prettier formatting
- [`@teo-garcia/tsconfig-shared`](https://github.com/teo-garcia/tsconfig-shared) - TypeScript settings

## Related Templates

| Template                                                                       | Description             |
| ------------------------------------------------------------------------------ | ----------------------- |
| [nest-template-monolith](https://github.com/teo-garcia/nest-template-monolith) | NestJS monolith starter |
| [react-template-next](https://github.com/teo-garcia/react-template-next)       | Next.js frontend        |
| [react-template-rr](https://github.com/teo-garcia/react-template-rr)           | React Router SPA        |

## License

MIT

---

<div align="center">
  <sub>Built by <a href="https://github.com/teo-garcia">teo-garcia</a></sub>
</div>
