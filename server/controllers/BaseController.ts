import { injectable } from 'inversify';
import { Request, Response } from 'koa';
import Router from 'koa-router';

@injectable()
export abstract class BaseController {
    protected contentType: any = {
        'content-type': 'application/json; charset=utf-8',
    };

    public handleError(ctx: Router.IRouterContext, next: () => Promise<any>): void {
        ctx.throw(500, 'Error Message');
    }
}
