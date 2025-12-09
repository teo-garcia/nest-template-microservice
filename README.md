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

## ✨ Features

| Category | Technologies |
|----------|-------------|
| **Framework** | NestJS 11 with microservice architecture |
| **Messaging** | Redis Streams for event-driven communication |
| **Database** | Optional Prisma ORM with PostgreSQL |
| **Observability** | Health checks, Prometheus metrics, structured logging |
| **Resilience** | Consumer groups, dead letter queues, auto-retry |
| **Type Safety** | TypeScript with strict mode |
| **DevOps** | Docker, GitHub Actions CI/CD |

## 📋 Requirements

- Node.js 22+
- pnpm 9+
- Docker & Docker Compose
- Redis (required for messaging)

## 🚀 Quick Start

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

# Start development server
pnpm start:dev
```

Open [http://localhost:3000](http://localhost:3000) to see your service.

## 📁 Project Structure

```
src/
├── config/                 # Service configuration
├── shared/
│   ├── filters/            # Global exception handling
│   ├── health/             # Health checks (DB, Redis)
│   ├── interceptors/       # Request/response transformation
│   ├── logger/             # Structured logging (Winston)
│   ├── messaging/          # Redis Streams pub/sub
│   ├── metrics/            # Prometheus metrics
│   └── prisma/             # Database client (optional)
└── modules/
    └── orders/             # Example domain module
```

## 🔧 Scripts

| Command | Description |
|---------|-------------|
| `pnpm start:dev` | Start with hot reload |
| `pnpm build` | Create production build |
| `pnpm start:prod` | Run production server |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run E2E tests |
| `pnpm lint:es` | Lint and fix with ESLint |
| `pnpm lint:ts` | TypeScript type checking |
| `pnpm format` | Format with Prettier |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:generate` | Generate Prisma client |

## 📨 Messaging

### Publishing Events

```typescript
await this.messageProducer.publish('orders:created', {
  orderId: '123',
  userId: 'user_456',
  amount: 99.99,
})
```

### Consuming Events

```typescript
await this.messageConsumer.subscribe(
  'orders:created',
  'payment-service',
  async (order) => {
    await this.processPayment(order)
  },
)
```

## 🏥 Health & Metrics

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Full health status |
| `GET /health/live` | Kubernetes liveness probe |
| `GET /health/ready` | Kubernetes readiness probe |
| `GET /metrics` | Prometheus metrics |

## 📦 Shared Configs

This template uses standardized configurations from the ecosystem:

- [`@teo-garcia/eslint-config-shared`](https://github.com/teo-garcia/eslint-config-shared) - ESLint rules
- [`@teo-garcia/prettier-config-shared`](https://github.com/teo-garcia/prettier-config-shared) - Prettier formatting
- [`@teo-garcia/tsconfig-shared`](https://github.com/teo-garcia/tsconfig-shared) - TypeScript settings

## 🔗 Related Templates

| Template | Description |
|----------|-------------|
| [nest-template-monolith](https://github.com/teo-garcia/nest-template-monolith) | NestJS monolith starter |
| [react-template-next](https://github.com/teo-garcia/react-template-next) | Next.js frontend |
| [react-template-rr](https://github.com/teo-garcia/react-template-rr) | React Router SPA |

## 📄 License

MIT

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/teo-garcia">teo-garcia</a></sub>
</div>
