// @ts-ignore
import { inject, injectable } from 'inversify';
import { controller, httpGet, httpPost } from 'inversify-koa-utils';
import { IConfig } from 'config';
import Router from 'koa-router';

@controller('*')
@injectable()
export class RenderController {
    private handle: Function;

    constructor(@inject('config') private config: IConfig, @inject('next') private app: any) {
        this.handle = this.app.getRequestHandler();
    }

    /**
     * UNPROTECTED
     * Gets current shop
     * @param ctx
     */
    @httpGet('/favicon.png')
    public async getFavicon(ctx: Router.IRouterContext): Promise<any> {
        await this.handle(ctx.req, ctx.res);
        ctx.respond = false;
    }

    /**
     * PROTECTED
     * Main renderer
     * @param ctx
     * @param next
     */
    @httpGet('*')
    public async catchAllGet(ctx: Router.IRouterContext, next: () => Promise<any>): Promise<any> {
        await this.handle(ctx.req, ctx.res);
        ctx.respond = false;
    }
}
