import { Request, Response, Next } from 'koa';
import { inject, injectable } from 'inversify';
import { controller, httpGet } from 'inversify-koa-utils';
import { IConfig } from 'config';
import Router from 'koa-router';

@controller('/health')
@injectable()
export class HealthController {
    constructor(@inject('config') private config: IConfig) {}

    @httpGet('/')
    public async health(ctx: Router.IRouterContext, next: () => Promise<any>): Promise<any> {
        const memoryUsage: any = process.memoryUsage();
        memoryUsage.heap_total = memoryUsage.heapTotal;
        delete memoryUsage.heapTotal;
        memoryUsage.heap_used = memoryUsage.heapUsed;
        delete memoryUsage.heapUsed;

        return {
            app_id: this.config.get('app.name'),
            app_version: `v${process.env.npm_package_version}`,
            uptime: process.uptime(),
            environment: process.env.NODE_ENV,
            node_version: process.version,
            platform: process.platform,
            memory_usage: memoryUsage,
            cpu_usage: process.cpuUsage(),
        };
    }
}
