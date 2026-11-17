// src/modules/hello/dto/hello-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class HelloResponseDto {
  @ApiProperty({
    example: 'Hello World!',
    description: 'Health message',
  })
  message: string;

  @ApiProperty({
    example: '2026-10-31T00:15:00.000Z',
    description: 'ISO-8601 timestamp of the response',
  })
  timestamp: string;
}

