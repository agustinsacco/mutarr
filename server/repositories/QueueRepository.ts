import { inject, injectable, named } from 'inversify';
import { IConfig } from 'config';
import { Logger } from '../utilities/Logger';
import { Repository } from './Repository';
import Queue from 'bull';
import { FSNode } from '../entities/FSNode';
import { VideoService } from '../services/VideoService';
import { SocketService } from '../services/SocketService';


@injectable()
export class QueueRepository implements Repository {
    private videoQueue;
    constructor(
        @inject('config') private config: IConfig,
        @inject('logger') private logger: Logger,
        @inject('Service') @named("Video") private videoService: VideoService,
        @inject('Service') @named("Socket") private socketService: SocketService,
    ) {
        this.videoQueue = new Queue('audio transcoding', { redis: { port: 6379, host: '127.0.0.1', password: 'foobared' } }); // Specify Redis connection usin
    }

    public async initialize(): Promise<void> {
        console.log('initializing queue repo')
        this.videoQueue.process(async (job: Queue.Job, done) => {
            this.logger.log('info', `Processing job ${job.id}`);
            this.socketService.jobEvent(job)


            this.videoService.convert(
                job, 
                async (progress: { [key: string]: string }) => {
                    console.log('stdout callback!');
                    await job.update(progress);
                    this.socketService.jobEvent(job);
                },
                (code: number) => {
                    console.log('close callback!');
                    console.log('FFMPEG SUCCESSFULLY CLOSED PROCESS BRO');
                    console.log(code);
                },
            );

            this.logger.log('info', `Completed ${job.id}`);
            done();

        });

    }

    public async getVideoJobs(): Promise<Queue.Job[]> {
        return await this.videoQueue.getActive();
    }

    public addVideoJob(node: FSNode): void {
        console.log('addVideoJob')
        this.videoQueue.add(node);
    }

}
