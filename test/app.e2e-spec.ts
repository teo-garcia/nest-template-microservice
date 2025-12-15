import { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'

import { AppModule } from '../src/app.module'
import { RedisHealthIndicator } from '../src/shared/health/redis.health'
import { MessageConsumerService } from '../src/shared/messaging/message-consumer.service'
import { MessageProducerService } from '../src/shared/messaging/message-producer.service'
import { RedisService } from '../src/shared/messaging/redis.service'
import { GlobalValidationPipe } from '../src/shared/pipes'
import { PrismaService } from '../src/shared/prisma'

/**
 * E2E Tests
 *
 * Tests the entire application flow including:
 * - REST API endpoints for Tasks
 * - Health checks
 * - Metrics
 * - Input validation
 * - Event publishing (mocked for fast tests without external dependencies)
 *
 * Note: Redis dependencies are mocked to enable tests to run without Docker.
 * For integration tests with real Redis, run `docker-compose up -d` and test manually.
 */
describe('AppController (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Mock Redis dependencies to avoid requiring external services in tests
      .overrideProvider(RedisService)
      .useValue({
        getClient: () => null,
        isHealthy: () => false,
        ping: async () => false,
        onModuleDestroy: async () => {},
      })
      .overrideProvider(MessageProducerService)
      .useValue({
        publish: async () => 'mocked-message-id', // No-op for tests
      })
      .overrideProvider(MessageConsumerService)
      .useValue({
        subscribe: async () => {},
        unsubscribe: async () => {},
        onModuleDestroy: async () => {},
      })
      .overrideProvider(RedisHealthIndicator)
      .useValue({
        isHealthy: async () => ({ redis: { status: 'up' } }), // Mock health check as passing
      })
      .overrideProvider(PrismaService)
      .useValue({
        // Mock Prisma with in-memory task storage for E2E tests
        task: (() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tasks = new Map<string, any>()
          let idCounter = 1

          return {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            findMany: async ({ where }: { where?: any } = {}) => {
              let results = [...tasks.values()]
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if (where?.status) results = results.filter((t: any) => t.status === where.status)

              if (where?.priority?.gte)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                results = results.filter((t: any) => t.priority >= where.priority.gte)
              return results
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            findUnique: async ({ where }: { where: any }) => tasks.get(where.id) || null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            create: async ({ data }: { data: any }) => {
              const task = {
                id: String(idCounter++),
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
              tasks.set(task.id, task)
              return task
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            update: async ({ where, data }: { where: any; data: any }) => {
              const task = tasks.get(where.id)
              if (!task) return null
              const updated = { ...task, ...data, updatedAt: new Date() }
              tasks.set(task.id, updated)
              return updated
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete: async ({ where }: { where: any }) => {
              const task = tasks.get(where.id)
              if (!task) return null
              tasks.delete(where.id)
              return task
            },
          }
        })(),
        $queryRawUnsafe: async () => [{ 1: 1 }], // Mock database ping for health checks
        onModuleDestroy: async () => {},
      })
      .compile()

    app = moduleFixture.createNestApplication()

    // Apply same global configuration as main.ts
    const configService = app.get(ConfigService)
    const apiPrefix = configService.get<string>('config.app.apiPrefix') ?? 'api'

    if (apiPrefix) {
      app.setGlobalPrefix(apiPrefix, {
        exclude: ['health', 'health/live', 'health/ready', 'metrics'],
      })
    }

    // Apply global validation pipe (same as main.ts)
    app.useGlobalPipes(new GlobalValidationPipe())

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('Service Info', () => {
    it('/ (GET) should return service info', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('service')
          expect(res.body).toHaveProperty('version')
          expect(res.body).toHaveProperty('environment')
          expect(res.body).toHaveProperty('timestamp')
        })
    })
  })

  describe('Health Checks', () => {
    it('/health/live (GET) should return 200', () => {
      return request(app.getHttpServer())
        .get('/health/live')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok')
        })
    })

    it('/health/ready (GET) should check dependencies', () => {
      return request(app.getHttpServer())
        .get('/health/ready')
        .expect((res) => {
          // Should be 200 if all dependencies are available, 503 if not
          expect([200, 503]).toContain(res.status)
        })
    })

    it('/health (GET) should return comprehensive health', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect((res) => {
          expect([200, 503]).toContain(res.status)
          expect(res.body).toHaveProperty('status')
        })
    })
  })

  describe('Metrics', () => {
    it('/metrics (GET) should return Prometheus metrics', () => {
      return request(app.getHttpServer())
        .get('/metrics')
        .expect(200)
        .expect('Content-Type', /text\/plain/)
        .expect((res) => {
          expect(res.text).toContain('http_requests_total')
          expect(res.text).toContain('http_request_duration_seconds')
        })
    })
  })

  describe('Tasks API', () => {
    let createdTaskId: string

    it('/api/tasks (GET) should return array (may be empty initially)', async () => {
      const response = await request(app.getHttpServer()).get('/api/tasks').expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })

    it('/api/tasks (POST) should create a task', async () => {
      const createTaskDto = {
        title: 'Test Task',
        description: 'This is a test task for microservice',
        priority: 5,
      }

      const response = await request(app.getHttpServer())
        .post('/api/tasks')
        .send(createTaskDto)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('title', createTaskDto.title)
      expect(response.body).toHaveProperty('description', createTaskDto.description)
      expect(response.body).toHaveProperty('priority', createTaskDto.priority)
      expect(response.body).toHaveProperty('status', 'PENDING')

      createdTaskId = response.body.id
    })

    it('/api/tasks (POST) should validate input - missing title', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tasks')
        .send({
          description: 'Task without title',
        })
        .expect(400)

      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('errors')
    })

    it('/api/tasks (POST) should validate input - invalid priority', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tasks')
        .send({
          title: 'Test Task',
          priority: 15, // Max is 10
        })
        .expect(400)

      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('errors')
    })

    it('/api/tasks (POST) should validate input - invalid status', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tasks')
        .send({
          title: 'Test Task',
          status: 'INVALID_STATUS',
        })
        .expect(400)

      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('errors')
    })

    it('/api/tasks/:id (GET) should return a task', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tasks/${createdTaskId}`)
        .expect(200)

      expect(response.body).toHaveProperty('id', createdTaskId)
      expect(response.body).toHaveProperty('title', 'Test Task')
    })

    it('/api/tasks/:id (GET) should return 404 for non-existent task', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tasks/non_existent_id')
        .expect(404)

      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('statusCode', 404)
    })

    it('/api/tasks/:id (PATCH) should update a task', async () => {
      const updateTaskDto = {
        title: 'Updated Task Title',
        status: 'IN_PROGRESS',
      }

      const response = await request(app.getHttpServer())
        .patch(`/api/tasks/${createdTaskId}`)
        .send(updateTaskDto)
        .expect(200)

      expect(response.body).toHaveProperty('id', createdTaskId)
      expect(response.body).toHaveProperty('title', updateTaskDto.title)
      expect(response.body).toHaveProperty('status', updateTaskDto.status)
    })

    it('/api/tasks/:id (PATCH) should return 404 for non-existent task', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/tasks/non_existent_id')
        .send({ title: 'New Title' })
        .expect(404)

      expect(response.body).toHaveProperty('statusCode', 404)
    })

    it('/api/tasks?status=IN_PROGRESS (GET) should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tasks?status=IN_PROGRESS')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      for (const task of response.body) {
        expect(task.status).toBe('IN_PROGRESS')
      }
    })

    it('/api/tasks?priority=5 (GET) should filter by priority', async () => {
      const response = await request(app.getHttpServer()).get('/api/tasks?priority=5').expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      for (const task of response.body) {
        expect(task.priority).toBeGreaterThanOrEqual(5)
      }
    })

    it('/api/tasks/:id (DELETE) should delete a task', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/tasks/${createdTaskId}`)
        .expect(200)

      expect(response.body).toHaveProperty('id', createdTaskId)
    })

    it('/api/tasks/:id (GET) should return 404 after deletion', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tasks/${createdTaskId}`)
        .expect(404)

      expect(response.body).toHaveProperty('statusCode', 404)
    })

    it('/api/tasks/:id (DELETE) should return 404 for non-existent task', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/tasks/non_existent_id')
        .expect(404)

      expect(response.body).toHaveProperty('statusCode', 404)
    })
  })
})
