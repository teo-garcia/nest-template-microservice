import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";

import { AppModule } from "../src/app.module";

/**
 * E2E Tests
 *
 * Tests the entire application flow including:
 * - REST API endpoints
 * - Health checks
 * - Metrics
 * - Message publishing (unit test - actual consumption requires multiple services)
 */
describe("AppController (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same global configuration as main.ts
    const configService = app.get(ConfigService);
    const apiPrefix =
      configService.get<string>("config.app.apiPrefix") ?? "api";

    if (apiPrefix) {
      app.setGlobalPrefix(apiPrefix, {
        exclude: ["health", "health/live", "health/ready", "metrics"],
      });
    }

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Service Info", () => {
    it("/ (GET) should return service info", () => {
      return request(app.getHttpServer())
        .get("/api")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("service");
          expect(res.body).toHaveProperty("version");
          expect(res.body).toHaveProperty("environment");
          expect(res.body).toHaveProperty("timestamp");
        });
    });
  });

  describe("Health Checks", () => {
    it("/health/live (GET) should return 200", () => {
      return request(app.getHttpServer())
        .get("/health/live")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("status", "ok");
        });
    });

    it("/health/ready (GET) should check dependencies", () => {
      return request(app.getHttpServer())
        .get("/health/ready")
        .expect((res) => {
          // Should be 200 if Redis is available, 503 if not
          expect([200, 503]).toContain(res.status);
        });
    });

    it("/health (GET) should return comprehensive health", () => {
      return request(app.getHttpServer())
        .get("/health")
        .expect((res) => {
          expect([200, 503]).toContain(res.status);
          expect(res.body).toHaveProperty("status");
        });
    });
  });

  describe("Metrics", () => {
    it("/metrics (GET) should return Prometheus metrics", () => {
      return request(app.getHttpServer())
        .get("/metrics")
        .expect(200)
        .expect("Content-Type", /text\/plain/)
        .expect((res) => {
          expect(res.text).toContain("http_requests_total");
          expect(res.text).toContain("http_request_duration_seconds");
        });
    });
  });

  describe("Orders API", () => {
    it("/api/orders (GET) should return empty array initially", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/orders")
        .expect(200);
      expect(response.body).toEqual([]);
    });

    it("/api/orders (POST) should create an order", async () => {
      const createOrderDto = {
        userId: "user_123",
        productId: "prod_456",
        quantity: 2,
        price: 29.99,
      };

      const response = await request(app.getHttpServer())
        .post("/api/orders")
        .send(createOrderDto)
        .expect(201);

      expect(response.body).toHaveProperty("orderId");
      expect(response.body).toHaveProperty("userId", createOrderDto.userId);
      expect(response.body).toHaveProperty(
        "productId",
        createOrderDto.productId,
      );
      expect(response.body).toHaveProperty("quantity", createOrderDto.quantity);
      expect(response.body).toHaveProperty("price", createOrderDto.price);
      expect(response.body).toHaveProperty("totalAmount", 59.98);
    });

    it("/api/orders (POST) should validate input", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/orders")
        .send({
          userId: "user_123",
          // Missing required fields
        })
        .expect(400);

      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("error");
    });

    it("/api/orders/:id (GET) should return an order", async () => {
      // First create an order
      const createResponse = await request(app.getHttpServer())
        .post("/api/orders")
        .send({
          userId: "user_123",
          productId: "prod_789",
          quantity: 1,
          price: 19.99,
        });

      const orderId = createResponse.body.orderId;

      // Then fetch it
      return request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("orderId", orderId);
        });
    });

    it("/api/orders/:id (GET) should return 404 for non-existent order", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/orders/non_existent_id")
        .expect(404);

      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("statusCode", 404);
    });
  });
});
