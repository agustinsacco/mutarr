import { inject, injectable, named } from 'inversify';
import { controller, httpDelete, httpGet, httpPost } from 'inversify-koa-utils';
import { IConfig } from 'config';
import Router from 'koa-router';
import { TranscodeQueueRepository } from '../repositories/TranscodeQueueRepository';
import { Logger } from '../utilities/Logger';
import { JobCollection } from '../entities/JobCollection';
import { SocketService } from '../services/SocketService';
import { Redis } from 'ioredis';
import { NodeRepository } from '../repositories/NodeRepository';
import { StatsRepository } from '../repositories/StatsRepository';

@controller('/queue')
@injectable()
export class QueueController {
  constructor(
    @inject('config') private config: IConfig,
    @inject('logger') private logger: Logger,
    @inject('Repository')
    @named('TranscodeQueue')
    private transcodeQueue: TranscodeQueueRepository,
    @inject('Service') @named('Socket') private socketService: SocketService,
    @inject('Repository') @named('Node') private nodeRepo: NodeRepository,
    @inject('Repository') @named('Stats') private statsRepo: StatsRepository,
    @inject('Publisher') private publisher: Redis
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

  @httpGet('/jobs/stats')
  public async getStats(
    ctx: Router.IRouterContext,
    next: () => Promise<any>
  ): Promise<any> {
    ctx.status = 200;
    try {
      const jobStats = await this.statsRepo.getAll();
      return jobStats;
    } catch (err: any) {
      this.logger.log('error', 'Cannot enqueue job');
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
      const node = await this.nodeRepo.getNode(ctx.request.body.path, true);
      await this.transcodeQueue.addJob(node);
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
    try {
      const job = await this.transcodeQueue.getJob(ctx.params.id);
      if (await job.isActive()) {
        await this.publisher.publish('abort', ctx.params.id);
      } else {
        await job.remove();

        await this.socketService.jobsRefresh(await this.transcodeQueue.getJobs());
      }
      ctx.status = 200;
      ctx.body = {
        message: `Abort message sent for job "${ctx.params.id}"`,
      };
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
