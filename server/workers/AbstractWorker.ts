import { Queue, Worker, Job } from 'bullmq';
import { injectable } from 'inversify';
import { Redis } from 'ioredis';
import { SocketService } from '../services/SocketService';

@injectable()
export abstract class AbstractWorker<D, R> {
  protected queue: Queue;
  protected worker: Worker | undefined;
  protected connection: Redis;

  constructor(queue: Queue, connection: Redis) {
    this.queue = queue;
    this.connection = connection;
  }

  public start(): void {
    this.worker = new Worker(this.queue.name, this.run.bind(this), {
      concurrency: 1,
      connection: this.connection,
    });
    console.log(`Worker for queue ${this.queue.name} started.`);
  }

  public async stop(): Promise<void> {
    if (this.worker) {
      // Stop worker
      await this.worker.close(true);
      await this.worker.disconnect();
      await this.connection.disconnect();
      console.log(`Worker for queue ${this.queue.name} stopped.`);
    }
  }

  public abstract run(job: Job<D>): Promise<R>;
}
