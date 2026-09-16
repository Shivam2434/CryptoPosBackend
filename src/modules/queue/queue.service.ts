// src/modules/queue/queue.service.ts
import { Injectable } from '@nestjs/common';
import { IQueueService, JobHandler } from './queue.interface';
import { InMemoryQueueService } from './in-memory-queue.service';

@Injectable()
export class QueueService implements IQueueService {
  constructor(private memoryQueue: InMemoryQueueService) {}

  publish<T>(
    topic: string,
    payload: T,
    options?: { delayMs?: number; maxAttempts?: number },
  ): Promise<string> {
    return this.memoryQueue.publish(topic, payload, options);
  }

  subscribe<T>(topic: string, handler: JobHandler<T>): void {
    this.memoryQueue.subscribe(topic, handler);
  }
}
