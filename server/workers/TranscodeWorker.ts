import { injectable, inject, named } from 'inversify';
import { AbstractWorker } from './AbstractWorker';
import { Job, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { container } from '../Registry';
import { AbstractProcessor } from '../processors/AbstractProcessor';
import { TranscodeQueueRepository } from '../repositories/TranscodeQueueRepository';
import { Logger } from '../utilities/Logger';

@injectable()
export class TranscodeWorker extends AbstractWorker<any, any> {
  public constructor(
    @inject('Repository')
    @named('TranscodeQueue')
    queue: TranscodeQueueRepository,
    @inject('Redis') connection: Redis,
    @inject('logger') private logger: Logger
  ) {
    super(queue.getQueue(), connection);
  }

  // Fix type and generics here
  public async run(job: Job): Promise<any> {
    this.logger.log('info', `starting job: ${job.id}`);
    this.logger.log('info', 'job data');
    this.logger.log('info', job.data);
    // Lets look for the processor
    let processor;
    try {
      processor = container.getNamed<AbstractProcessor>(
        'Processor',
        'Transcode'
      );
    } catch (err) {
      console.log(err)
      throw new Error(`Processor not found`);
    }

    // Start processing and listening for abort
    try {
      /**
       * Promise race ensures that a promise will be resolved from either "abort"
       * or "process". Since "abort" can only reject we assume process will eventually
       * resolve.
       */
      const rsp = <any>(
        await Promise.race([processor.abort(job), processor.process(job)])
      );
      return rsp;
    } catch (err) {
      await job.remove();
      throw new Error(
        `Processor has failed with error: ${(<Error>err).message}`
      );
    }
  }
}
