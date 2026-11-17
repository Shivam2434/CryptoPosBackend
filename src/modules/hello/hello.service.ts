// src/modules/hello/hello.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HelloResponseDto } from './dto/hello-response.dto';

@Injectable()
export class HelloService {
  private readonly logger = new Logger(HelloService.name);

  getHello(): HelloResponseDto {
    this.logger.log('🌍 [HelloService.getHello] Building Hello World response');
    const response: HelloResponseDto = {
      message: 'Hello World!',
      timestamp: new Date().toISOString(),
    };
    this.logger.log(
      `📤 [HelloService.getHello] Returning response: ${JSON.stringify(response)}`,
    );
    return response;
  }
}
