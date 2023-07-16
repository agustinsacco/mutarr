import { inject, injectable, named } from 'inversify';
import { IConfig } from 'config';
import { Logger } from '../utilities/Logger';
import { FSNode } from '../entities/FSNode';
import { VideoService } from './VideoService';
import { SocketService } from './SocketService';
import { QueueRepository } from '../repositories/QueueRepository';
import { Job } from 'bull';
import { EventEmitter } from 'events';
import { NodeRepository } from '../repositories/NodeRepository';
import { JobCollection } from '../entities/JobCollection';


@injectable()
export class QueueService {
    private jobEmitter: EventEmitter;
    private timer: NodeJS.Timer | undefined;
    constructor(
        @inject('config') private config: IConfig,
        @inject('logger') private logger: Logger,
        @inject('Repository') @named('Queue') private queueRepo: QueueRepository,
        @inject('Repository') @named('Node') private nodeRepo: NodeRepository,
        @inject('Service') @named('Video') private videoService: VideoService,
        @inject('Service') @named('Socket') private socketService: SocketService,
    ) { }

    public initialize(): void {
        this.jobEmitter = new EventEmitter();
        const queue = this.queueRepo.getQueue();

        // Process queue (2 at a time)
        queue.process(2, async (job: Job, done) => {
            this.logger.log('info', `Processing job ${job.id}`);
            // Emit event 
            await this.processConversion(job)
            done();
        });

        // Events
        queue.on('progress', async (job: Job, jobPromise) => {
            this.logger.log('info', `Job progress: ${job.id}`);
            this.refreshJobs();
        });
        queue.on('active', async (job: Job, jobPromise) => {
            this.refreshJobs();
        });
        queue.on('completed', async (job: Job) => {
            this.logger.log('info', `Completed job: ${job.id}`);
            this.socketService.nodesRefresh(await this.nodeRepo.getFreshNodes());
            this.refreshJobs();
        });
        queue.on('removed', async (job: Job) => {
            this.logger.log('info', `Removed job: ${job.id}`);
            this.refreshJobs();
        });
        queue.on('failed', async (job: Job) => {
            this.logger.log('info', `Failed job: ${job.id}`);
            this.refreshJobs();
        });

        // Start killed job event listener
        this.handleOnKilled();
    }

    public async removeJob(id: string): Promise<void> {
        try {
            const job = await this.queueRepo.getJob(id);
            const isActive = await job.isActive();
            // Lets check if the job is currently active
            if (isActive) {
                this.logger.log('debug', `Emitting event to kill active job ${id}`)
                this.jobEmitter.emit('kill', job);
            }
            await this.queueRepo.removeJob(job);
            return;
        } catch (err: any) {
            this.logger.log('error', `Error deleting job ${id} | ${err?.message}`);
            throw new Error('This video is already part of an active or upcoming conversion.');
        }
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
                        } catch (err: any) {
                            job.moveToFailed({
                                message: 'Post conversion for video failed'
                            });
                            this.logger.log('error', `Post conversion for ${job.id} failed with error: ${err.message}`);
                        }
                    } else {
                        this.logger.log('error', `FFMPEG conversion for ${job.id} failed. Reason unknown.`);

                        job.moveToFailed({
                            message: 'FFMPEG conversion for failed. Reason unknown.'
                        });
                    }
                    this.logger.log('info', `Completed ${job.id} with code: ${code}`);

                    // Graceful shut down of process otherwise.
                    // For now do nothing. FFMPEG has already terminated gracefully.
                    return reject(`Process closed in failed state from job ${job.id}`);
                },
            );
            this.logger.log('info', `Saving process id ${process.pid} into ${job.id}`);
            // Save the process id in job metadata
            job.update({
                ...job.data,
                pid: process.pid
            });
        })
    }

    private async refreshJobs(): Promise<void> {
        const jobs = await this.queueRepo.getJobs()
        this.socketService.jobsRefresh(jobs);
        this.ensureTimer(jobs);
    }

    private ensureTimer(jobs: JobCollection): void {
        // If there are active jobs
        if (jobs.active.length > 0 && !this.timer) {
            this.logger.log('info', '*** Starting timer!');
            this.timer = setInterval(async () => {
                // Update all jobs to reduce change of race conditions
                const jobs = await this.queueRepo.getJobs()
                this.socketService.jobsRefresh(jobs);
            }, 3000);
        } else {
            // Ensure timer is stopped
            this.logger.log('debug', '*** Cancelling timer!');
            clearInterval(this.timer);
            this.timer = undefined;
        }
    
    }

    private handleOnKilled(): void {
        // Handle Job 
        this.jobEmitter.on('kill', async (job: Job) => {
            this.logger.log('debug', `Received kill event for job: ${job.id}. Killing process ${job.data.pid}`);
            await process.kill(job.data.pid);
        });
    }
}
