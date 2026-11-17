// src/modules/hello/hello.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { HelloController } from './hello.controller';
import { HelloService } from './hello.service';

describe('HelloController', () => {
  let helloController: HelloController;
  let helloService: HelloService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HelloController],
      providers: [HelloService],
    }).compile();

    helloController = module.get<HelloController>(HelloController);
    helloService = module.get<HelloService>(HelloService);
  });

  it('should be defined', () => {
    expect(helloController).toBeDefined();
    expect(helloService).toBeDefined();
  });

  describe('getHello', () => {
    it('should return hello response with message and timestamp', () => {
      const response = helloController.getHello();
      expect(response).toBeDefined();
      expect(response.message).toBe('Hello World!');
      expect(response.timestamp).toBeDefined();
    });
  });
});

