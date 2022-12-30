import { inject, injectable, named } from 'inversify';
import { controller, httpDelete, httpGet, httpPost } from 'inversify-koa-utils';
import { IConfig } from 'config';
import Router from 'koa-router';
import { QueueRepository } from '../repositories/QueueRepository';
import { Logger } from '../utilities/Logger';
import Queue from 'bull';
import { JobCollection } from '../entities/JobCollection';

@controller('/queue')
@injectable()
export class QueueController {
    constructor(
        @inject('config') private config: IConfig,
        @inject('logger') private logger: Logger,
        @inject('Repository') @named('Queue') private queueRepo: QueueRepository,

    ) { }

    @httpGet('/jobs')
    public async getJobs(ctx: Router.IRouterContext, next: () => Promise<any>): Promise<JobCollection> {
        try {
            const jobs = await this.queueRepo.getJobs();
            return jobs;
        } catch (err: any) {
            this.logger.log('error', 'Cannot get jobs');
            ctx.throw(500, err.message)
        }
    }


    @httpGet('/status')
    public async getStatus(ctx: Router.IRouterContext, next: () => Promise<any>): Promise<any> {
        try {
            const isPaused = await this.queueRepo.isPaused();
            return {
                isPaused: isPaused,
            };
        } catch (err: any) {
            this.logger.log('error', 'Cannot get status');
            ctx.throw(500, err.message)
        }
    }


    @httpPost('/jobs')
    public async addJob(ctx: Router.IRouterContext, next: () => Promise<any>): Promise<void> {
        ctx.status = 204;
        try {
            await this.queueRepo.addJob(ctx.request.body);
        } catch (err: any) {
            this.logger.log('error', 'Cannot enqueue job');
            ctx.throw(500, err.message)
        }
    }


    @httpDelete('/jobs/:id')
    public async deleteJob(ctx: Router.IRouterContext, next: () => Promise<any>): Promise<void> {
        ctx.status = 204;
        try {
            await this.queueRepo.removeJob(ctx.params?.id);
        } catch (err: any) {
            this.logger.log('error', 'Cannot enqueue job');
            ctx.throw(500, err.message)
        }
    }

    @httpPost('/pause')
    public async pause(ctx: Router.IRouterContext, next: () => Promise<any>): Promise<void> {
        try {
            await this.queueRepo.pause();
            ctx.status = 204
        } catch (err: any) {
            this.logger.log('error', 'Cannot get jobs');
            ctx.throw(500, err.message)
        }
    }

    @httpPost('/resume')
    public async resume(ctx: Router.IRouterContext, next: () => Promise<any>): Promise<void> {
        try {
            await this.queueRepo.resume();
            ctx.status = 204
        } catch (err: any) {
            this.logger.log('error', 'Cannot get jobs');
            ctx.throw(500, err.message)
        }
    }
}
