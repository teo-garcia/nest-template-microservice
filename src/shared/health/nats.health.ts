import { Injectable } from '@nestjs/common'
import { HealthIndicatorResult } from '@nestjs/terminus'

import { NatsService } from '../messaging'

@Injectable()
export class NatsHealthIndicator {
  constructor(private readonly natsService: NatsService) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = await this.natsService.isHealthy()

    if (!isHealthy) {
      throw new Error('NATS JetStream is not healthy')
    }

    return {
      [key]: {
        status: 'up',
        message: 'NATS JetStream is healthy',
      },
    }
  }
}
