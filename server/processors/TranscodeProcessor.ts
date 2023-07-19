import { inject, injectable, named } from 'inversify';
import { Logger } from '../utilities/Logger';
import { FSNode } from '../entities/FSNode';
import { VideoService } from '../services/VideoService';
import { Job } from 'bullmq';
import { AbstractProcessor } from './AbstractProcessor';
import { Redis } from 'ioredis';
import { SocketService } from '../services/SocketService';
import { TranscodeQueueRepository } from '../repositories/TranscodeQueueRepository';

@injectable()
export class TranscodeProcessor extends AbstractProcessor {
  constructor(
    @inject('logger') private logger: Logger,
    @inject('Service') @named('Video') private videoService: VideoService,
    @inject('Service') @named('Socket') private socketService: SocketService,
    @inject('Repository')
    @named('TranscodeQueue')
    private queueRepo: TranscodeQueueRepository,
    @inject('Subscriber') subscriber: Redis
  ) {
    super(subscriber);
  }

  public async process(job: Job): Promise<{ message: string }> {
    await this.processConversion(job);
    return {
      message: 'Completed ffmpeg conversion',
    };
  }

  private async processConversion(job: Job): Promise<void> {
    const node: FSNode = <FSNode>job.data;
    return new Promise(async (resolve, reject) => {
      try {
        this.logger.log('info', `Preconversion for ${job.id}`);
        await this.videoService.preConversion(node);
      } catch (err) {
        return reject(err);
      }

      this.logger.log('info', `Conversion for ${job.id}`);
      const process = this.videoService.convert(
        node,
        // onUpdate update job data with progress
        async (data: { [key: string]: string }) => {
          await job.updateData({
            ...job.data,
            progress: data,
          });
          // Send socket event to clients with full job progress
          await this.socketService.jobsRefresh(await this.queueRepo.getJobs());
        },
        // onClose
        async (code: number) => {
          this.logger.log('info', `Completed ${job.id} with code: ${code}`);
          // Completed successfully
          if (code == 0) {
            // Run post conversion
            try {
              this.logger.log('info', `Post conversion for ${job.id}`);
              await this.videoService.postConversion(node);
              this.logger.log('info', `Completed ${job.id} with code: ${code}`);
              // Send socket event to clients with full job progress
              await this.socketService.jobsRefresh(
                await this.queueRepo.getJobs()
              );
              return resolve();
            } catch (err: any) {
              this.logger.log(
                'error',
                `Post conversion for ${job.id} failed with error: ${err.message}`
              );
              return reject(
                `Post conversion for ${job.id} failed with error: ${err.message}`
              );
            }
          } else {
            this.logger.log(
              'error',
              `FFMPEG conversion for ${job.id} failed. Reason unknown.`
            );
            return reject(
              `FFMPEG conversion for ${job.id} failed. Reason unknown.`
            );
          }
        }
      );
      this.logger.log(
        'info',
        `Saving process id ${process.pid} into ${job.id}`
      );
    });
  }
}
