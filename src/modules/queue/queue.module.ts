// src/modules/queue/queue.module.ts
import { Module, Global } from '@nestjs/common';
import { InMemoryQueueService } from './in-memory-queue.service';
import { QueueService } from './queue.service';

@Global()
@Module({
  providers: [InMemoryQueueService, QueueService],
  exports: [QueueService],
})
export class QueueModule {}
