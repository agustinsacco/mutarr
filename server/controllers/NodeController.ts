import { Request, Response, Next } from 'koa';
import { inject, injectable, named } from 'inversify';
import { controller, httpGet } from 'inversify-koa-utils';
import { IConfig } from 'config';
import Router from 'koa-router';
import { FileRepository } from '../repositories/FileRepository';

@controller('/fs')
@injectable()
export class NodeController {
    constructor(
        @inject('config') private config: IConfig,
        @inject('Repository') @named('File') private repository: FileRepository,

        ) {}

    @httpGet('/nodes')
    public async getNodesCustom(ctx: Router.IRouterContext, next: () => Promise<any>): Promise<any> {
        return await this.repository.getNodesCustom();
    }
}
