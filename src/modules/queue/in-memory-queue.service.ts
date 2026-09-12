// src/modules/queue/in-memory-queue.service.ts
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as crypto from 'crypto';
import { IQueueService, QueueJob, JobHandler } from './queue.interface';

@Injectable()
export class InMemoryQueueService implements IQueueService, OnModuleDestroy {
    private readonly logger = new Logger(InMemoryQueueService.name);
    private handlers: Map<string, JobHandler[]> = new Map();
    private activeTimers: Set<NodeJS.Timeout> = new Set();
    private isShuttingDown = false;

    async publish<T>(
        topic: string,
        payload: T,
        options: { delayMs?: number; maxAttempts?: number } = {},
    ): Promise<string> {
        const jobId = crypto.randomUUID();
        const job: QueueJob<T> = {
            id: jobId,
            topic,
            payload,
            attempts: 0,
            maxAttempts: options.maxAttempts || 5,
            delayMs: options.delayMs || 0,
            createdAt: new Date(),
        };

        if (job.delayMs && job.delayMs > 0) {
            const timer = setTimeout(() => {
                this.activeTimers.delete(timer);
                if (!this.isShuttingDown) {
                    this.executeJob(job);
                }
            }, job.delayMs);
            this.activeTimers.add(timer);
        } else {
            // Run on next tick
            setImmediate(() => this.executeJob(job));
        }

        return jobId;
    }

    subscribe<T>(topic: string, handler: JobHandler<T>): void {
        const list = this.handlers.get(topic) || [];
        list.push(handler as JobHandler);
        this.handlers.set(topic, list);
        this.logger.log(`Subscribed handler to queue topic: ${topic}`);
    }

    private async executeJob(job: QueueJob): Promise<void> {
        if (this.isShuttingDown) return;

        const handlers = this.handlers.get(job.topic) || [];
        if (handlers.length === 0) {
            this.logger.debug(`No handlers registered for topic: ${job.topic}`);
            return;
        }

        job.attempts += 1;

        for (const handler of handlers) {
            try {
                await handler(job.payload, job);
            } catch (error) {
                this.logger.error(
                    `Job ${job.id} on topic ${job.topic} failed attempt ${job.attempts}/${job.maxAttempts}: ${error.message}`,
                );

                if (job.attempts < job.maxAttempts) {
                    const backoffMs = Math.min(1000 * Math.pow(2, job.attempts), 3600000);
                    this.logger.log(`Retrying job ${job.id} in ${backoffMs}ms`);
                    const timer = setTimeout(() => {
                        this.activeTimers.delete(timer);
                        if (!this.isShuttingDown) {
                            this.executeJob(job);
                        }
                    }, backoffMs);
                    this.activeTimers.add(timer);
                }
            }
        }
    }

    onModuleDestroy() {
        this.isShuttingDown = true;
        for (const timer of this.activeTimers) {
            clearTimeout(timer);
        }
        this.activeTimers.clear();
    }
}
