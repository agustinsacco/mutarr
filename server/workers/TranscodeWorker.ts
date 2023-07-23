import { injectable, inject, named } from 'inversify';
import { AbstractWorker } from './AbstractWorker';
import { Job, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { container } from '../Registry';
import { AbstractProcessor } from '../processors/AbstractProcessor';
import { TranscodeQueueRepository } from '../repositories/TranscodeQueueRepository';
import { Logger } from '../utilities/Logger';
import { SocketService } from '../services/SocketService';

@injectable()
export class TranscodeWorker extends AbstractWorker<any, any> {
  public constructor(
    @inject('Repository')
    @named('TranscodeQueue')
    private queueRepo: TranscodeQueueRepository,
    @inject('Service') @named('Socket') private socketService: SocketService,
    @inject('Redis') connection: Redis,
    @inject('logger') private logger: Logger
  ) {
    const queue = queueRepo.getQueue();
    super(queue, connection);
  }

  public async run(job: Job): Promise<any> {
    this.logger.log('info', `starting job: ${job.id}`);
    this.logger.log('info', 'job data');
    this.logger.log('info', job.data);
    // Lets look for the processor
    let processor;
    try {
      processor = container.getNamed<AbstractProcessor>('Processor', 'Transcode');
    } catch (err) {
      console.log(err);
      throw new Error(`Processor not found`);
    }

    // Start processing and listening for abort
    try {
      const rsp = await processor.process(job);

      return rsp;
    } catch (err) {
      await job.remove();
      throw new Error(`Processor has failed with error: ${(<Error>err).message}`);
    }
  }

  public async progress(job: Job, progress: number): Promise<void> {
    const jobs = await this.queueRepo.getJobs();
    this.socketService.jobsRefresh(jobs);
  }
  public async completed(job: Job): Promise<void> {
    const jobs = await this.queueRepo.getJobs();
    this.socketService.jobsRefresh(jobs);
  }
  public async failed(job: Job, error: unknown): Promise<void> {
    const jobs = await this.queueRepo.getJobs();
    this.socketService.jobsRefresh(jobs);
  }
}
