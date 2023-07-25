import { inject, injectable, named } from 'inversify';
import { IConfig } from 'config';
import { Logger } from '../utilities/Logger';
import { Repository } from './Repository';
import { Queue, Job } from 'bullmq';
import { FSNode } from '../entities/FSNode';
import { JobCollection } from '../entities/JobCollection';
import { getFileFormat } from '../utilities/File';
import Redis from 'ioredis';
import { NodeRepository } from './NodeRepository';
import { isFileSupported } from '../utilities/Video';

@injectable()
export class TranscodeQueueRepository implements Repository {
  private queue: Queue;

  constructor(
    @inject('config') private config: IConfig,
    @inject('logger') private logger: Logger,
    @inject('Redis') private redis: Redis
  ) {}

  public initialize(): void {
    this.queue = new Queue('transcode', { connection: this.redis });
  }

  public getQueue(): Queue {
    return this.queue;
  }

  public async getJob(id: string): Promise<Job> {
    return await this.queue.getJob(id);
  }

  public async getJobs(): Promise<JobCollection> {
    const promises = await Promise.all([
      this.queue.getActive(),
      this.queue.getDelayed(),
      this.queue.getCompleted(),
      this.queue.getFailed(),
      this.queue.getWaiting(),
    ]);
    return {
      active: promises[0],
      delayed: promises[1],
      completed: promises[2],
      failed: promises[3],
      waiting: promises[4],
    };
  }

  private getTargetCodecs = () => {
    if (
      this.config.get<string>('targetCodec') == 'hvec' ||
      this.config.get<string>('targetCodec') == 'h265'
    ) {
      return ['hevc', 'h265'];
    }
    return [this.config.get<string>('targetCodec')];
  };

  public async addJob(node: FSNode): Promise<void> {
    if (isFileSupported(getFileFormat(<string>node.name))) {
    } else {
      const error = `Unable to queue job. File ${node.name} is not a video file`;
      this.logger.log('error', error);
      throw new Error(error);
    }
    const videoStream = node.getVideoStream();
    // If its a video but already in target codec return false.
    if (this.getTargetCodecs().includes(videoStream.codec_name.toLowerCase())) {
      throw new Error(
        `Unable to queue job. File ${node.name} is already in target codec`
      );
    }

    // Check if node is already part of an active or upcoming job
    if (await this.isScheduled(node.path)) {
      const error = `Unable to queue job. File ${node.name} is already active or queued`;
      this.logger.log('error', error);
      throw new Error(error);
    }

    await this.queue.add(node.path, node);
  }

  public async removeJob(job: Job): Promise<void> {
    try {
      await job?.remove();
      return;
    } catch (err: any) {
      this.logger.log('error', `Error deleting job ${job.id} | ${err?.message}`);
      throw new Error(`Error deleting job ${job.id} | ${err?.message}`);
    }
  }

  public async pauseQueue(): Promise<void> {
    await this.queue.pause();
  }

  public async isPaused(): Promise<boolean> {
    return await this.queue.isPaused();
  }

  public async resumeQueue(): Promise<void> {
    await this.queue.resume();
  }

  public async purgeQueue(): Promise<void> {
    await this.queue.drain();
  }

  public async isActive(id: string): Promise<boolean> {
    if ((await this.queue.getActive()).find((j: Job) => id == j.id)) {
      return true;
    }
    return false;
  }

  private async isScheduled(path: string): Promise<boolean> {
    const jobs: Job<any>[] = [];
    const waitingJobs = await this.queue.getWaiting();
    const activeJobs = await this.queue.getActive();
    jobs.push(<any>waitingJobs);
    jobs.push(<any>activeJobs);
    if (jobs.find((j: Job) => j.data?.path == path)) {
      return true;
    }
    return false;
  }
}
