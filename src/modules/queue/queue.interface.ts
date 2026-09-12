// src/modules/queue/queue.interface.ts

export interface QueueJob<T = any> {
    id: string;
    topic: string;
    payload: T;
    attempts: number;
    maxAttempts: number;
    delayMs?: number;
    createdAt: Date;
    nextRunAt?: Date;
}

export type JobHandler<T = any> = (payload: T, job: QueueJob<T>) => Promise<void>;

export interface IQueueService {
    publish<T>(topic: string, payload: T, options?: { delayMs?: number; maxAttempts?: number }): Promise<string>;
    subscribe<T>(topic: string, handler: JobHandler<T>): void;
}
