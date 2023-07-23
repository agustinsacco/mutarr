import { Queue, Worker, Job } from 'bullmq';
import { injectable } from 'inversify';
import { Redis } from 'ioredis';
import { SocketService } from '../services/SocketService';
import { IConfig } from 'config';

@injectable()
export abstract class AbstractWorker<D, R> {
  protected config: IConfig;
  protected queue: Queue;
  protected worker: Worker | undefined;
  protected connection: Redis;

  constructor(config: IConfig, queue: Queue, connection: Redis) {
    this.config = config;
    this.queue = queue;
    this.connection = connection;
  }

  public start(): void {
    this.worker = new Worker(this.queue.name, this.run.bind(this), {
      concurrency: this.config.get<number>('workerConcurrency'),
      connection: this.connection,
    });

    // Listen to progress and completed events and emit events
    this.worker.on('progress', (job: Job, progress: number | object) => {
      this.progress(job, progress);
    });
    this.worker.on('completed', (job: Job) => {
      this.completed(job);
    });
    this.worker.on('failed', (job: Job, error: unknown) => {
      this.failed(job, error);
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
  public abstract progress(job: Job, progress: number | object): Promise<void>;
  public abstract completed(job: Job): Promise<void>;
  public abstract failed(job: Job, error: unknown): Promise<void>;
}
