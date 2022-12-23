import { Request, Response, Next } from 'koa';
import { inject, injectable, named } from 'inversify';
import { controller, httpGet } from 'inversify-koa-utils';
import { IConfig } from 'config';
import Router from 'koa-router';
import { NodeRepository } from '../repositories/NodeRepository';

@controller('/nodes')
@injectable()
export class NodeController {
    constructor(
        @inject('config') private config: IConfig,
        @inject('Repository') @named('File') private repository: NodeRepository,

        ) {}

    @httpGet('/')
    public async getNodesCustom(ctx: Router.IRouterContext, next: () => Promise<any>): Promise<any> {
        return await this.repository.getNodes();
    }
}
