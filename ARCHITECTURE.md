# Microservice Architecture Guide

This guide explains the event-driven architecture patterns used in this template. If you're new to microservices or Redis Streams, start here!

---

## Table of Contents

- [Redis Streams Explained](#redis-streams-explained)
- [Event Publishing Pattern](#event-publishing-pattern)
- [Consumer Groups](#consumer-groups)
- [Retry Logic & Dead Letter Queues](#retry-logic--dead-letter-queues)
- [Testing Event-Driven Systems](#testing-event-driven-systems)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)
- [Migration from Monolith](#migration-from-monolith)

---

## Redis Streams Explained

### What are Redis Streams?

Redis Streams is a data structure that acts as an append-only log, similar to Kafka but simpler and built into Redis.

**Key Characteristics:**
- **Append-only**: Messages are added to the end and never modified
- **Ordered**: Messages maintain the order they were added
- **Persistent**: Messages are stored in Redis and survive crashes
- **Multiple consumers**: Many services can read the same stream
- **Consumer groups**: Distribute messages across multiple instances

### Streams vs Pub/Sub vs Queues

| Feature | Redis Pub/Sub | Redis Streams | Message Queues (RabbitMQ/SQS) |
|---------|---------------|---------------|-------------------------------|
| **Persistence** | No (fire and forget) | Yes (stored in Redis) | Yes |
| **History** | No | Yes (can read old messages) | No (once consumed, gone) |
| **Multiple consumers** | Yes | Yes (via consumer groups) | Yes |
| **Acknowledgments** | No | Yes | Yes |
| **Complexity** | Very simple | Simple | Complex |
| **Use case** | Real-time notifications | Event sourcing, microservices | Task queues, jobs |

### When to Use Redis Streams

✅ **Good for:**
- Microservice communication
- Event sourcing
- Activity feeds
- Real-time analytics
- Audit logs

❌ **Not ideal for:**
- Simple request/response (use HTTP)
- Long-running batch jobs (use queues like Bull)
- Extremely high throughput (use Kafka)
- Complex routing (use RabbitMQ)

---

## Event Publishing Pattern

### How Events Work in This Template

```
1. User creates a task via API
   └─> POST /api/tasks

2. TasksService creates task in database
   └─> Prisma.task.create()

3. TasksService publishes event to Redis Stream
   └─> MessageProducerService.publish('tasks:created', event)

4. Other services consume the event
   └─> TaskConsumerService receives event
   └─> Processes the event (e.g., send email, update cache)

5. If processing fails
   └─> Retry up to 3 times
   └─> If still failing, move to dead letter queue
```

### Example: Task Created Event

**When a task is created:**

```typescript
// In TasksService (src/modules/tasks/services/tasks.service.ts)
async create(createTaskDto: CreateTaskDto): Promise<Task> {
  // 1. Save to database
  const task = await this.prisma.task.create({
    data: createTaskDto,
  })

  // 2. Publish event to Redis Stream
  await this.messageProducer.publish('tasks:created', {
    eventType: 'task.created',
    taskId: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
  })

  return task
}
```

**Other services can react:**

```typescript
// In another microservice or consumer
await this.messageConsumer.subscribe<TaskCreatedEvent>(
  'tasks:created',
  'email-service-consumer',
  async (event) => {
    // Send welcome email to user
    await emailService.send({
      to: event.assignedTo,
      subject: `New task: ${event.title}`,
      body: `Task ${event.taskId} has been assigned to you.`,
    })
  }
)
```

### Event Naming Conventions

Use clear, descriptive names following this pattern:

```
{domain}:{action}

Examples:
- tasks:created
- tasks:updated
- tasks:status_changed
- tasks:deleted
- orders:placed
- payments:completed
```

---

## Consumer Groups

### What Consumer Groups Do

Consumer groups allow **load balancing** across multiple service instances:

```
Stream: tasks:created
│
├─> Consumer Group: "email-service"
│   ├─> Instance 1 (processes messages 1, 3, 5...)
│   └─> Instance 2 (processes messages 2, 4, 6...)
│
└─> Consumer Group: "analytics-service"
    ├─> Instance 1 (processes ALL messages)
    └─> Instance 2 (standby)
```

**Key Benefits:**
- Each message in a group is processed by **only one consumer**
- If a consumer crashes, another consumer picks up unacknowledged messages
- Different services have different consumer groups (so they all get the events)

### How to Use Consumer Groups

```typescript
// Each service should have a unique consumer group name
await this.messageConsumer.subscribe<TaskEvent>(
  'tasks:created',           // Stream name
  'my-service-name',         // Consumer group (unique per service)
  async (event) => {
    // Process event
  }
)
```

**Naming Convention:**
- Use your service name as the consumer group name
- Example: `email-service`, `analytics-service`, `notification-service`

---

## Retry Logic & Dead Letter Queues

### Automatic Retries

When event processing fails, the system automatically retries:

```
Attempt 1: Process event → ❌ Error
  ↓ Wait 100ms
Attempt 2: Process event → ❌ Error
  ↓ Wait 400ms (exponential backoff)
Attempt 3: Process event → ❌ Error
  ↓ Wait 900ms
Attempt 4: Process event → ❌ Error
  ↓
Move to Dead Letter Queue (DLQ)
```

**Retry Configuration:**
- **Max retries**: 3 attempts
- **Backoff**: Exponential (100ms, 400ms, 900ms, 1600ms...)
- **DLQ stream**: `{original-stream}:dlq` (e.g., `tasks:created:dlq`)

### Dead Letter Queue (DLQ)

Messages that fail after all retries go to a dead letter queue for manual review:

```typescript
// Monitor DLQ manually
const dlqMessages = await redis.xrange('tasks:created:dlq', '-', '+')

// Reprocess a DLQ message
await messageProducer.publish('tasks:created', dlqMessages[0])
```

**Best Practices:**
- Monitor DLQ size with alerts (e.g., > 100 messages = alert)
- Investigate and fix root cause before reprocessing
- Consider automated DLQ cleanup after 7-30 days

---

## Testing Event-Driven Systems

### Unit Tests

Mock the message producer to verify events are published:

```typescript
// In tasks.service.spec.ts
it('should publish event when task is created', async () => {
  const mockMessageProducer = {
    publish: jest.fn(),
  }

  const service = new TasksService(prisma, mockMessageProducer)
  await service.create({ title: 'Test' })

  expect(mockMessageProducer.publish).toHaveBeenCalledWith(
    'tasks:created',
    expect.objectContaining({ title: 'Test' })
  )
})
```

### E2E Tests

This template uses **mocked Redis** for fast E2E tests:

```typescript
// In test/app.e2e-spec.ts
.overrideProvider(MessageProducerService)
.useValue({
  publish: async () => 'mocked-message-id', // No-op
})
```

**Why mock?**
- Tests run in < 1 second (no Docker needed)
- CI/CD pipelines are fast and cheap
- Tests focus on HTTP API behavior, not messaging

### Integration Tests (Local Dev Only)

For testing actual event flow, run locally with real Redis:

```bash
# Start real Redis
docker-compose up -d

# Run integration test
pnpm test:integration  # (if you create these)
```

---

## Common Patterns

### Pattern 1: Saga Pattern (Distributed Transactions)

When an operation spans multiple services:

```
Order Service:
  1. Create order → Publish "order.created"

Inventory Service:
  2. Consume "order.created"
  3. Reserve inventory
  4. Publish "inventory.reserved" OR "inventory.insufficient"

Payment Service:
  5. Consume "inventory.reserved"
  6. Charge payment
  7. Publish "payment.succeeded" OR "payment.failed"

Order Service:
  8. Consume "payment.succeeded" → Mark order as complete
  9. Consume "payment.failed" → Publish "order.cancel"

Inventory Service:
  10. Consume "order.cancel" → Release reserved inventory
```

**Implementation Tip:** Each service maintains its own state and reacts to events.

### Pattern 2: CQRS (Command Query Responsibility Segregation)

Separate writes (commands) from reads (queries):

```
Write Side:
  POST /api/tasks → Write to PostgreSQL → Publish event

Read Side:
  Consume events → Update Redis cache or search index
  GET /api/tasks → Read from cache (fast!)
```

**When to use:**
- High read/write ratio (e.g., 100 reads per 1 write)
- Complex aggregations needed
- Different scaling needs for reads vs writes

### Pattern 3: Event Sourcing

Store all changes as events instead of current state:

```
Traditional:
  tasks table: { id: 1, status: "COMPLETED" }

Event Sourcing:
  events: [
    { eventType: "task.created", status: "PENDING" },
    { eventType: "task.started", status: "IN_PROGRESS" },
    { eventType: "task.completed", status: "COMPLETED" }
  ]

Rebuild state: Replay all events → Current status = "COMPLETED"
```

**When to use:**
- Need full audit trail
- Time-travel debugging
- Complex domain logic

**When NOT to use:**
- Simple CRUD apps
- High write throughput (rebuilding state is slow)

---

## Troubleshooting

### "ECONNREFUSED" Error

**Problem**: Redis not running

```bash
[ERROR] Redis client error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution**:
```bash
docker-compose up -d  # Start Redis
```

### Events Not Being Consumed

**Problem**: Consumer not registered or wrong consumer group name

**Check:**
1. Is `MessageConsumerService.subscribe()` called in `onModuleInit()`?
2. Is the stream name correct?
3. Is the consumer group name unique per service?

**Debug:**
```typescript
// Add logging
this.logger.log(`Subscribed to ${streamName} with group ${consumerGroup}`)
```

### High Memory Usage

**Problem**: Redis Streams grow unbounded

**Solution**: Use XTRIM to limit stream size

```typescript
// In MessageProducerService
await this.redis.xtrim('tasks:created', 'MAXLEN', '~', 10000)
// Keeps ~10,000 most recent messages
```

### Duplicate Event Processing

**Problem**: Same event processed multiple times

**Causes:**
- Consumer not acknowledging messages
- Consumer timeout too short
- Consumer crash before ACK

**Solution:**
- Ensure proper error handling
- Implement idempotency keys
- Increase consumer timeout

---

## Migration from Monolith

If you're moving from the monolith template to microservices:

### Step 1: Keep Existing Code

Don't rewrite everything. Start by **adding event publishing** to existing code:

```typescript
// Before (monolith)
async create(dto: CreateTaskDto): Promise<Task> {
  return this.prisma.task.create({ data: dto })
}

// After (add event publishing)
async create(dto: CreateTaskDto): Promise<Task> {
  const task = await this.prisma.task.create({ data: dto })

  // Add this
  await this.messageProducer.publish('tasks:created', {
    taskId: task.id,
    ...task,
  })

  return task
}
```

### Step 2: Create Consumer Services

Extract logic into separate consumer services:

```typescript
// New file: src/consumers/email-consumer.service.ts
@Injectable()
export class EmailConsumerService {
  async onModuleInit() {
    await this.messageConsumer.subscribe(
      'tasks:created',
      'email-service',
      async (event) => {
        // Move email logic here
        await this.emailService.sendTaskCreatedEmail(event)
      }
    )
  }
}
```

### Step 3: Test Both Old and New Flows

Run both synchronous and asynchronous logic during transition:

```typescript
async create(dto: CreateTaskDto): Promise<Task> {
  const task = await this.prisma.task.create({ data: dto })

  // Old way (keep for now)
  await this.emailService.sendTaskCreatedEmail(task)

  // New way (test in parallel)
  await this.messageProducer.publish('tasks:created', task)

  return task
}
```

### Step 4: Gradually Remove Synchronous Logic

Once confident in async flow, remove old synchronous calls:

```typescript
async create(dto: CreateTaskDto): Promise<Task> {
  const task = await this.prisma.task.create({ data: dto })

  // Removed: await this.emailService.sendTaskCreatedEmail(task)

  // Only async now
  await this.messageProducer.publish('tasks:created', task)

  return task
}
```

---

## Further Reading

### Official Documentation

- [Redis Streams](https://redis.io/docs/data-types/streams/) - Official Redis Streams guide
- [NestJS Microservices](https://docs.nestjs.com/microservices/basics) - NestJS microservice patterns

### Architecture Patterns

- [Microservices Patterns (Chris Richardson)](https://microservices.io/patterns/index.html) - Comprehensive pattern catalog
- [Event-Driven Architecture (Martin Fowler)](https://martinfowler.com/articles/201701-event-driven.html) - EDA principles

### Books

- "Building Microservices" by Sam Newman
- "Designing Data-Intensive Applications" by Martin Kleppmann
