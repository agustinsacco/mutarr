import { inject, injectable, named } from 'inversify';
import { controller, httpGet, httpPost } from 'inversify-koa-utils';
import { IConfig } from 'config';
import Router from 'koa-router';
import { NodeRepository } from '../repositories/NodeRepository';
import { FSNode, FSNodeType } from '../entities/FSNode';
import { Stats } from '../entities/Stats';
import { bytesToReadable, readableToBytes } from '../utilities/Bytes';

@controller('/nodes')
@injectable()
export class NodeController {
    constructor(
        @inject('config') private config: IConfig,
        @inject('Repository') @named('Node') private repository: NodeRepository,

    ) { }

    @httpGet('/')
    public async getNodes(ctx: Router.IRouterContext, next: () => Promise<any>): Promise<FSNode[]> {
        if (ctx?.query?.path) {
            return [await this.repository.getNode(<string>ctx.query.path, true)];
        }
        return await this.repository.getNodes();

    }

    @httpGet('/stats')
    public async getNodesStats(ctx: Router.IRouterContext, next: () => Promise<any>): Promise<Stats> {
        const stats = await this.repository.getNodeStats();
        return stats;
    }

}
