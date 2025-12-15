import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'

import { AppController } from './app.controller'

describe('AppController', () => {
  let appController: AppController
  let configService: ConfigService

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, unknown> = {
                'config.service.name': 'test-microservice',
                'config.service.version': '1.0.0',
                'config.app.env': 'test',
              }
              return config[key]
            }),
          },
        },
      ],
    }).compile()

    appController = app.get<AppController>(AppController)
    configService = app.get<ConfigService>(ConfigService)
  })

  describe('root', () => {
    it('should return service info', () => {
      const result = appController.getInfo()

      expect(result).toHaveProperty('service', 'test-microservice')
      expect(result).toHaveProperty('version', '1.0.0')
      expect(result).toHaveProperty('environment', 'test')
      expect(result).toHaveProperty('timestamp')
      expect(typeof result.timestamp).toBe('string')
    })

    it('should call ConfigService with correct keys', () => {
      appController.getInfo()

      expect(configService.get).toHaveBeenCalledWith('config.service.name')
      expect(configService.get).toHaveBeenCalledWith('config.service.version')
      expect(configService.get).toHaveBeenCalledWith('config.app.env')
    })
  })
})
