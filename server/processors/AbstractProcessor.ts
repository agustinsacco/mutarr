import { Job } from 'bullmq';
import { inject, injectable, named } from 'inversify';
import { Redis } from 'ioredis';
import { Logger } from '../utilities/Logger';
import { SocketService } from '../services/SocketService';
import { TranscodeQueueRepository } from '../repositories/TranscodeQueueRepository';
import { ChildProcess } from 'child_process';

export interface AlgoliaBatchImportOptions {
  env: 'staging' | 'prod';
  job: Job;
  algoliaIndex: string;
  opensearchIndex: string;
  mappingFn: (doc: unknown) => unknown;
}

@injectable()
export abstract class AbstractProcessor {
  protected logger: Logger;
  protected socketService: SocketService;
  constructor(
    @inject('Logger') logger: Logger,
    @inject('Subscriber') private subscriber: Redis,
    @inject('Service') @named('Socket') socketService: SocketService,
    @inject('Repository')
    @named('TranscodeQueue')
    private transcodeQueue: TranscodeQueueRepository
  ) {
    this.logger = logger;
    this.socketService = socketService;
  }

  /**
   * Abstract process function must be implemented
   * in concrete Processor class.
   * @param job
   */
  public abstract process(job: Job): Promise<ChildProcess>;

  public async run<T>(job: Job): Promise<void> {
    const proc = await this.process(job)
    await this.abort(job, proc);
  }

  /**
   * Abort is called at the same time as process to ensure
   * a cancellation of the job happens immediately.
   *
   * This function returns a promise that never resolves and will
   * reject if it receives a signal that the job must be terminated.
   * @param job
   * @returns
   */
  public async abort(job: Job, process: ChildProcess): Promise<void> {
    return new Promise((resolve, reject) => {
      // Subscribe to abort messages
      this.subscriber.subscribe('abort', (err) => {
        if (err) {
          console.log('Failed to subscribe:', err);
          return;
        }
        console.log('Subscribed successfully! Listening for abort messages...');
      });

      // Listen for all job abort messages
      this.subscriber.on(
        'message',
        async (channel: string, message: string) => {
          if (channel === 'abort' && message == job.id) {
            this.logger.log(
              'debug',
              `Processing job conversion: ${job.id} and received kill event for ${job.data.pid}`
            );
            // Lets first kill the process and then move job to failed
            try {
              await process.kill('SIGTERM');
              await process.kill('SIGKILL');
            } catch (err) {
              this.logger.log('error', 'Got error aborting job');
            }

            reject(
              new Error(`Job ${job.id} has been aborted before completion!`)
            );
          }
        }
      );
    });
  }
}
