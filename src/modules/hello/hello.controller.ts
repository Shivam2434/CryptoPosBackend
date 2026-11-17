// src/modules/hello/hello.controller.ts
import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HelloService } from './hello.service';
import { HelloResponseDto } from './dto/hello-response.dto';

@ApiTags('Hello')
@Controller('hello')
export class HelloController {
  private readonly logger = new Logger(HelloController.name);

  constructor(private readonly helloService: HelloService) {}

  @Get()
  @ApiOperation({ summary: 'Health check and connectivity verification endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Successful hello response indicating API availability',
    type: HelloResponseDto,
  })
  getHello(): HelloResponseDto {
    this.logger.log('📨 [GET /api/v1/hello] Received hello request');
    const response = this.helloService.getHello();
    this.logger.log(
      `✅ [GET /api/v1/hello] Responding with: "${response.message}"`,
    );
    return response;
  }
}
