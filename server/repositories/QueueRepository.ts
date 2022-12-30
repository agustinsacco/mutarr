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
                console.log('>>>>>>>>>>>>>>>>>>> starting timer to send progress!!!')
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
                console.log('>>>>>>>>>>>>>>>>>>> STOPPING timer progress!!! (completed)')
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
                console.log('>>>>>>>>>>>>>>>>>>> STOPPING timer progress!!! (removed)')
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
                console.log('>>>>>>>>>>>>>>>>>>> STOPPING timer progress!!! (failed)',)
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
            await this.videoService.preConversion(node);
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
                        // Lets move the file over and delete the old
                        await this.videoService.postConversion(node);
                        return resolve();
                    }
                    // Graceful shut down of process otherwise.
                    // For now do nothing. FFMPEG has already terminated gracefully.
                    return resolve();
                },
            );
            //
            this.jobEmitter.on('kill', async (id: string) => {
                console.log(`Processing job conversion: ${job.id} and received kill event for ${id}`);
                if (job.id === id) {
                    console.log('Killing process!')
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
        console.log('addJob');
        // Check if video is already in target codec
        const n = await this.nodeRepository.getNode(node.path);
        // console.log('node', n)

        if (this.config.get<string[]>('videoFormats').includes(getFileFormat(<string> node.name))) {
            console.log('yay its a video')
        } else {
            console.log('oh no not video..')
        }

        // Check if node is already part of an active or upcoming job
        if (await this.isNodeScheduled(node.path)) {
            throw new Error('This video is already part of an active or upcoming conversion.')
        }

        await this.queue.add(node);
    }

    public async removeJob(id: string): Promise<void> {
        console.log('removeJob', id);
        try {
            const job = await this.queue.getJob(id);

            // Lets check if the job is currently active
            if (await this.isActiveJob(id)) {
                console.log('emitting event because we need to kill active job')
                this.jobEmitter.emit('kill', id);
                return;
            }
            await job?.remove();
            return;
        } catch (err) {
            console.log('error deleting job bro!', err)
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
        console.log(path)
        if (jobs.find((j: Job) => j.data?.path == path)) {
            return true;
        }
        return false;
    }
}
