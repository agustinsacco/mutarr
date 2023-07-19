import { inject, injectable, named } from 'inversify';
import { controller, httpDelete, httpGet, httpPost } from 'inversify-koa-utils';
import { IConfig } from 'config';
import Router from 'koa-router';
import { TranscodeQueueRepository } from '../repositories/TranscodeQueueRepository';
import { Logger } from '../utilities/Logger';
import { JobCollection } from '../entities/JobCollection';
import { TranscodeProcessor } from '../processors/TranscodeProcessor';
import { SocketService } from '../services/SocketService';

@controller('/queue')
@injectable()
export class QueueController {
  constructor(
    @inject('config') private config: IConfig,
    @inject('logger') private logger: Logger,
    @inject('Repository')
    @named('TranscodeQueue')
    private transcodeQueue: TranscodeQueueRepository,
    @inject('Service') @named('Socket') private socketService: SocketService
  ) {}

  @httpGet('/jobs')
  public async getJobs(
    ctx: Router.IRouterContext,
    next: () => Promise<any>
  ): Promise<JobCollection> {
    try {
      const jobs = await this.transcodeQueue.getJobs();
      return jobs;
    } catch (err: any) {
      this.logger.log('error', 'Cannot get jobs');
      ctx.throw(500, err.message);
    }
  }

  @httpGet('/status')
  public async getStatus(
    ctx: Router.IRouterContext,
    next: () => Promise<any>
  ): Promise<any> {
    try {
      const isPaused = await this.transcodeQueue.isPaused();
      return {
        isPaused: isPaused,
      };
    } catch (err: any) {
      this.logger.log('error', 'Cannot get status');
      ctx.throw(500, err.message);
    }
  }

  @httpPost('/jobs')
  public async addJob(
    ctx: Router.IRouterContext,
    next: () => Promise<any>
  ): Promise<void> {
    ctx.status = 204;
    try {
      await this.transcodeQueue.addJob(ctx.request.body);
    } catch (err: any) {
      this.logger.log('error', 'Cannot enqueue job');
      ctx.throw(500, err.message);
    }
  }

  @httpDelete('/jobs/:id')
  public async deleteJob(
    ctx: Router.IRouterContext,
    next: () => Promise<any>
  ): Promise<void> {
    ctx.status = 204;
    try {
      await this.transcodeQueue.removeJob(
        await this.transcodeQueue.getJob(ctx.params?.id)
      );
      await this.socketService.jobsRefresh(await this.transcodeQueue.getJobs());
    } catch (err: any) {
      this.logger.log('error', 'Cannot enqueue job');
      ctx.throw(500, err.message);
    }
  }

  @httpPost('/pause')
  public async pause(
    ctx: Router.IRouterContext,
    next: () => Promise<any>
  ): Promise<void> {
    try {
      await this.transcodeQueue.pauseQueue();
      ctx.status = 204;
    } catch (err: any) {
      this.logger.log('error', 'Cannot get jobs');
      ctx.throw(500, err.message);
    }
  }

  @httpPost('/resume')
  public async resume(
    ctx: Router.IRouterContext,
    next: () => Promise<any>
  ): Promise<void> {
    try {
      await this.transcodeQueue.resumeQueue();
      ctx.status = 204;
    } catch (err: any) {
      this.logger.log('error', 'Cannot get jobs');
      ctx.throw(500, err.message);
    }
  }

  @httpPost('/purge')
  public async purge(
    ctx: Router.IRouterContext,
    next: () => Promise<any>
  ): Promise<void> {
    try {
      await this.transcodeQueue.purgeQueue();
      ctx.status = 204;
    } catch (err: any) {
      this.logger.log('error', 'Cannot get jobs');
      ctx.throw(500, err.message);
    }
  }
}
