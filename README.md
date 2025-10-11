# NestJS Microservice Template

Production-ready NestJS microservice with Redis Streams messaging, health checks, metrics, and comprehensive DevOps tooling.

## Requirements

- Node 22+
- pnpm 9
- Docker & Docker Compose
- Redis (required for messaging)

## Installation

```bash
npx degit teo-garcia/templates/nest-template-microservice my-service
cd my-service
pnpm install
cp .env.example .env
docker-compose up -d
pnpm start:dev
```

## Features

- **NestJS** - Progressive Node.js framework
- **Redis Streams** - Event-driven inter-service messaging
- **Prisma ORM** - Optional type-safe database access
- **Health Checks** - Kubernetes-ready liveness and readiness probes
- **Prometheus Metrics** - Built-in observability
- **Request Tracing** - Request ID propagation for distributed tracing
- **Consumer Groups** - Load balancing and message processing
- **Dead Letter Queue** - Failed message handling
- **Docker** - Multi-stage production builds
- **GitHub Actions** - CI/CD with testing and security scanning

## Scripts

```bash
pnpm start:dev      # Development with hot reload
pnpm build          # Production build
pnpm start:prod     # Run production build
pnpm test           # Run unit tests
pnpm test:e2e       # Run e2e tests
pnpm lint:es        # ESLint check
pnpm lint:ts        # TypeScript type check
pnpm format         # Format code with Prettier
pnpm db:generate    # Generate Prisma client (if using DB)
pnpm db:migrate     # Run database migrations (if using DB)
```

## Messaging

### Publishing Events

```typescript
await this.messageProducer.publish('orders:created', {
  orderId: '123',
  userId: 'user_456',
  amount: 99.99
})
```

### Consuming Events

```typescript
await this.messageConsumer.subscribe(
  'orders:created',
  'payment-service',
  async (order) => {
    await this.processPayment(order)
  }
)
```

## Project Structure

```
src/
├── config/              # Service configuration
├── shared/
│   ├── filters/         # Global exception handling
│   ├── health/          # Health checks (DB, Redis)
│   ├── interceptors/    # Request/response transformation
│   ├── logger/          # Structured logging
│   ├── messaging/       # Redis Streams pub/sub
│   ├── metrics/         # Prometheus metrics
│   └── prisma/          # Database access (optional)
└── modules/
    └── orders/          # Example domain module
```

## License

MIT
