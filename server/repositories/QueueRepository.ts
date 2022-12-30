import { inject, injectable, named } from 'inversify';
import { IConfig } from 'config';
import { Logger } from '../utilities/Logger';
import { Repository } from './Repository';
import Queue, { Job } from 'bull';
import { FSNode } from '../entities/FSNode';
import { VideoService } from '../services/VideoService';
import { SocketService } from '../services/SocketService';
import { JobCollection } from '../entities/JobCollection';
import { EventEmitter } from 'events';
import { NodeRepository } from './NodeRepository';
import { getFileFormat } from '../utilities/File';

@injectable()
export class QueueRepository implements Repository {
    private queue;
    private jobEmitter: EventEmitter;
    private timer: NodeJS.Timer | undefined;

    constructor(
        @inject('config') private config: IConfig,
        @inject('logger') private logger: Logger,
        @inject('Repository') @named('Node') private nodeRepository: NodeRepository,
        @inject('Service') @named('Video') private videoService: VideoService,
        @inject('Service') @named('Socket') private socketService: SocketService,
    ) {
        this.queue = new Queue('audio transcoding', {
            redis: {
                port: 6379,
                host: '127.0.0.1'
            }
        }); // Specify Redis connection usin
        this.jobEmitter = new EventEmitter();
    }

    public async initialize(): Promise<void> {
        // Process queue (2 at a time)
        this.queue.process(2, async (job: Queue.Job, done) => {
            this.logger.log('info', `Processing job ${job.id}`);
            // Emit event 
            await this.processConversion(job)
            done();
        });

        // Events
        this.queue.on('active', async (job: Queue.Job, jobPromise) => {
            this.logger.log('info', `Starting job: ${job.id}`);
            this.socketService.jobsRefresh(await this.getJobs());

            // Start progress interval if its not already on
            if (!this.timer) {
                this.logger.log('debug', 'Starting timer');
                this.timer = setInterval(async () => {
                    // Update all jobs to reduce change of race conditions
                    this.socketService.jobsRefresh(await this.getJobs());
                }, 2000)
            }
        });
        this.queue.on('completed', async (job: Queue.Job) => {
            this.logger.log('info', `Finishing job: ${job.id}`);
            this.socketService.jobsRefresh(await this.getJobs());
            this.socketService.nodesRefresh(await this.nodeRepository.refreshNodes());

            // If timer has an existing interval 
            // and we no longer have active jobs, stop progress
            if (this.timer !== undefined && (await this.queue.getActive()).length === 0) {
                this.logger.log('debug', 'Stopping timer');
                clearInterval(this.timer);
                this.timer = undefined;
            }
        });
        this.queue.on('removed', async (job: Queue.Job) => {
            this.logger.log('info', `Removed job: ${job.id}`);
            this.socketService.jobsRefresh(await this.getJobs());

            // If timer has an existing interval 
            // and we no longer have active jobs, stop progress
            if (this.timer !== undefined && (await this.queue.getActive()).length === 0) {
                this.logger.log('debug', 'Stopping timer');
                clearInterval(this.timer);
                this.timer = undefined;
            }
        });
        this.queue.on('failed', async (job: Queue.Job) => {
            this.logger.log('info', `Failed job: ${job.id}`);
            this.socketService.jobsRefresh(await this.getJobs());

            // If timer has an existing interval 
            // and we no longer have active jobs, stop progress
            if (this.timer !== undefined && (await this.queue.getActive()).length === 0) {
                this.logger.log('debug', 'Stopping timer');
                clearInterval(this.timer);
                this.timer = undefined;
            }
        });

    }

    private async processConversion(job: Queue.Job): Promise<void> {
        const node: FSNode = <FSNode>job.data;
        return new Promise(async (resolve, reject) => {
            // Start Event listener in case we need to terminal the job
            // Delete converted asset in conversion folder
            try {
                this.logger.log('info', `Preconversion for ${job.id}`);
                await this.videoService.preConversion(node);
            } catch (err) {
                return reject(err);
            }

            this.logger.log('info', `Conversion for ${job.id}`);
            const process = this.videoService.convert(
                node,
                // onUpdate
                async (data: { [key: string]: string }) => {
                    job.update({
                        ...job.data,
                        progress: data
                    });
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
                            return resolve();
                        } catch (err) {
                            return reject(err);
                        }
                    }
                    this.logger.log('info', `Completed ${job.id} with code: ${code}`);

                    // Graceful shut down of process otherwise.
                    // For now do nothing. FFMPEG has already terminated gracefully.
                    return reject('FFMPEG returned and error code during conversion');
                },
            );
            //
            this.jobEmitter.on('kill', async (id: string) => {
                this.logger.log('debug', `Processing job conversion: ${job.id} and received kill event for ${id}`);
                if (job.id === id) {
                    this.logger.log('debug', 'Killing process!')
                    // Lets first kill the process and then move job to failed
                    await process.kill('SIGINT');
                    // Now kill the job
                    await job.moveToFailed({ message: 'Job was cancelled manually.' });
                    this.socketService.jobsRefresh(await this.getJobs());
                }
            });
        })
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
            this.logger.log('error', 'This file is not a video.'));
            throw new Error('This file is not a video.');
        }

        // Check if node is already part of an active or upcoming job
        if (await this.isNodeScheduled(node.path)) {
            this.logger.log('error', 'This video is already part of an active or upcoming conversion.');
            throw new Error('This video is already part of an active or upcoming conversion.');
        }

        await this.queue.add(node);
    }

    public async removeJob(id: string): Promise<void> {
        try {
            const job = await this.queue.getJob(id);

            // Lets check if the job is currently active
            if (await this.isActiveJob(id)) {
                this.logger.log('debug', `Emitting event to kill active job ${id}`)
                this.jobEmitter.emit('kill', id);
                return;
            }
            await job?.remove();
            return;
        } catch (err: any) {
            this.logger.log('error', `Error deleting job ${id} | ${err?.message}`);
            throw new Error('This video is already part of an active or upcoming conversion.');
        }

    }

    public async pause(): Promise<void> {
        await this.queue.pause();
    }

    public async isPaused(): Promise<boolean> {
        return await this.queue.isPaused();
    }

    public async resume(): Promise<void> {
        await this.queue.resume();
    }


    /**
     * PRIVATE
     */

    /**
     * 
     * @param id 
     * @returns 
     */
    private async isActiveJob(id: string): Promise<boolean> {
        if ((await this.queue.getActive()).find((j: Job) => id == j.id)) {
            return true;
        }
        return false;
    }

    private async isNodeScheduled(path: string): Promise<boolean> {
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
