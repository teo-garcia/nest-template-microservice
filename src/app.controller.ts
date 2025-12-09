import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * App Controller
 *
 * Root controller for basic service information.
 */
@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Service information endpoint
   *
   * Returns basic information about the microservice.
   * Useful for verifying the service is running and identifying it in logs.
   */
  @Get()
  getInfo() {
    return {
      service: this.configService.get("config.service.name"),
      version: this.configService.get("config.service.version"),
      environment: this.configService.get("config.app.env"),
      timestamp: new Date().toISOString(),
    };
  }
}
