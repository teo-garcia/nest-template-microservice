# NestJS Microservice Template

Production-ready NestJS microservice with Redis Streams messaging, health checks, metrics, and comprehensive DevOps tooling.

## Requirements

- Node 22+
- pnpm 9
- Docker & Docker Compose
- Redis (required for messaging)

## Installation

1. Get the template:

```bash
npx degit teo-garcia/templates/nest-template-microservice my-service
cd my-service
```

2. Install dependencies:

```bash
pnpm install
```

3. Configure environment:

```bash
cp .env.example .env
# Edit .env with your settings
```

4. Start services:

```bash
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

## Docker

```bash
# Development
docker-compose up

# With optional database
docker-compose --profile with-db up

# Production build
docker build -f docker/Dockerfile -t my-service .
docker run -p 3000:3000 my-service
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
        ├── controllers/ # REST API
        ├── services/    # Business logic & event publishing
        └── dto/         # Data transfer objects
```

## Endpoints

- `GET /health` - Comprehensive health status
- `GET /health/live` - Liveness probe (Kubernetes)
- `GET /health/ready` - Readiness probe (checks Redis, optional DB)
- `GET /metrics` - Prometheus metrics
- `POST /api/orders` - Example: Create order (publishes event)
- `GET /api/orders` - Example: List orders

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

### Features

- **Consumer Groups** - Load balancing across service instances
- **Auto-retry** - 3 attempts with exponential backoff
- **Dead Letter Queue** - Failed messages stored in `{stream}:dlq`
- **Pending Recovery** - Processes unacknowledged messages on startup

## Configuration

Key environment variables:

```env
SERVICE_NAME=my-service
PORT=3000

# Redis (Required)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Database (Optional)
DATABASE_ENABLED=false
DATABASE_URL=postgresql://...

# Features
ENABLE_MESSAGING=true
METRICS_ENABLED=true
```

## Deployment

This template is cloud-agnostic and works with:

- **AWS** - ECS, EKS, App Runner
- **GCP** - Cloud Run, GKE
- **Azure** - Container Instances, AKS
- **Kubernetes** - Any cluster

Health check endpoints are configured for Kubernetes probes.

## License

MIT
