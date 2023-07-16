import { inject, injectable, named } from 'inversify';
import { IConfig } from 'config';
import { Logger } from '../utilities/Logger';
import { Repository } from './Repository';
import Queue, { Job } from 'bull';
import { FSNode } from '../entities/FSNode';
import { VideoService } from '../services/VideoService';
import { SocketService } from '../services/SocketService';
import { JobCollection } from '../entities/JobCollection';
import { NodeRepository } from './NodeRepository';
import { getFileFormat } from '../utilities/File';

@injectable()
export class QueueRepository implements Repository {
    private queue: Queue.Queue;

    constructor(
        @inject('config') private config: IConfig,
        @inject('logger') private logger: Logger,
    ) { }

    public async initialize(): Promise<void> {
        this.queue = new Queue('audio transcoding', {
            redis: {
                port: 6379,
                host: '127.0.0.1'
            }
        });
    }

    public getQueue(): Queue.Queue {
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
        ])
        return {
            active: promises[0],
            delayed: promises[1],
            completed: promises[2],
            failed: promises[3],
            waiting: promises[4],
        }

    }

    public async addJob(node: FSNode): Promise<void> {
        if (this.config.get<string[]>('videoFormats').includes(getFileFormat(<string>node.name))) {
        } else {
            this.logger.log('error', 'This file is not a video.');
            throw new Error('This file is not a video.');
        }

        const videoStream = node.getVideoStream();
        console.log(videoStream);
        // If its a video but already in target codec return false.
        if (this.config.get<string>('conversionConfig.codec') == videoStream.codec_name) {
            console.log('target code is gucci')
        }

        // Check if node is already part of an active or upcoming job
        if (await this.isScheduled(node.path)) {
            this.logger.log('error', 'This video is already part of an active or upcoming conversion.');
            throw new Error('This video is already part of an active or upcoming conversion.');
        }

        await this.queue.add(node);
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
        await this.queue.empty();
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
