import { inject, injectable, named } from 'inversify';
import { controller, httpGet, httpPost } from 'inversify-koa-utils';
import { IConfig } from 'config';
import Router from 'koa-router';
import { QueueRepository } from '../repositories/QueueRepository';
import Queue from 'bull';
import { Logger } from '../utilities/Logger';

@controller('/jobs')
@injectable()
export class JobController {
    constructor(
        @inject('config') private config: IConfig,
        @inject('logger') private logger: Logger,
        @inject('Repository') @named('Queue') private queueRepo: QueueRepository,

    ) { }

    @httpPost('/')
    public async enqueue(ctx: Router.IRouterContext, next: () => Promise<any>): Promise<void> {
        console.log('enqueuing job bro');
        ctx.status = 204;
        // 
        try {
            await this.queueRepo.addVideoJob(ctx.request.body);
        } catch (err: any) {
            this.logger.log('error', 'Cannot enqueue job');
            ctx.throw(500, err.message)
        }
    }


    @httpGet('/')
    public async getAll(ctx: Router.IRouterContext, next: () => Promise<any>): Promise<Queue.Job[]> {
        console.log('getting jobs bro');
        // 
        try {
            return await this.queueRepo.getVideoJobs();
        } catch (err: any) {
            this.logger.log('error', 'Cannot get jobs');
            ctx.throw(500, err.message)
        }
    }
}
