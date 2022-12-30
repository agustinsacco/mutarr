import { inject, injectable, named } from 'inversify';
import { controller, httpGet, httpPost } from 'inversify-koa-utils';
import { IConfig } from 'config';
import Router from 'koa-router';
import { NodeRepository } from '../repositories/NodeRepository';
import { FSNode } from '../entities/FSNode';

@controller('/nodes')
@injectable()
export class NodeController {
    constructor(
        @inject('config') private config: IConfig,
        @inject('Repository') @named('Node') private repository: NodeRepository,

        ) {}

    @httpGet('/')
    public async getNodes(ctx: Router.IRouterContext, next: () => Promise<any>): Promise<FSNode[]> {
        return await this.repository.getNodes();
    }

    @httpPost('/streams')
    public async getFileNode(ctx: Router.IRouterContext, next: () => Promise<any>): Promise<FSNode> {
        return await this.repository.getFileNode(ctx.request?.body?.path)
    }
}
