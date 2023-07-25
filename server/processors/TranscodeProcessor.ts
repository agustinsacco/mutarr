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
    @inject('logger') logger: Logger,
    @inject('Service') @named('Video') private videoService: VideoService,
    @inject('Service') @named('Socket') socketService: SocketService,
    @inject('Repository')
    @named('TranscodeQueue')
    transcodeQueue: TranscodeQueueRepository,
    @inject('Repository')
    @named('TranscodeQueue')
    private queueRepo: TranscodeQueueRepository,
    @inject('Subscriber') subscriber: Redis
  ) {
    super(logger, subscriber, socketService, transcodeQueue);
  }

  public async process(job: Job): Promise<any> {
    return new Promise(async (resolve, reject): Promise<void> => {
      const node: FSNode = <FSNode>job.data;

      try {
        this.logger.log('info', `Preconversion for ${job.id}`);
        await this.videoService.preConversion(node);
      } catch (err) {
        this.logger.log('info', `Preconversion failed for ${job.id}`);
        throw err;
      }
      const onUpdate = async (data: { [key: string]: string }) => {
        this.logger.log('info', `Updating data for job ${job.id}`);
        this.logger.log('info', data);
        await job.updateProgress(10);
        await job.updateData({
          ...job.data,
          progress: data,
        });
      };

      const onClose = async (code: number) => {
        this.logger.log('info', `Completed ${job.id} with code: ${code}`);
        // Completed successfully
        if (code == 0) {
          // Run post conversion
          try {
            this.logger.log('info', `Post conversion for ${job.id}`);
            await this.videoService.postConversion(job, node);
            await job.updateProgress(100);
            this.logger.log('info', `Completed ${job.id} with code: ${code}`);
            // Send socket event to clients with full job progress
            resolve(`Completed ${job.id} with code: ${code}`);
          } catch (err: any) {
            this.logger.log(
              'error',
              `Post conversion for ${job.id} failed with error: ${err.message}`
            );
            reject(`Post conversion for ${job.id} failed with error: ${err.message}`);
          }
        } else {
          this.logger.log(
            'error',
            `FFMPEG conversion for ${job.id} failed. Reason unknown.`
          );
          reject(`FFMPEG conversion for ${job.id} failed. Reason unknown.`);
        }
      };

      const onError = (err: Error) => {
        this.logger.log(
          'error',
          `FFMPEG terminated for job ${job.id}. ${err.message}`
        );
      }

      const process = await this.videoService.convert(node, onUpdate, onClose, onError);

      // Setup abort to kill process and job
      // will reject if abort message is received
      try {
        await this.abort(job, process);
      } catch (err) {
        reject((<Error>err).message);
      }
    });
  }
}
