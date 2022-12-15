import Router from 'koa-router';
import request from 'superagent';

interface Options {
    app: string;
    env: 'development' | 'production';
}

interface Log {
    date?: Date;
    app?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS';
    route?: string;
    resCode?: number;
    resTime?: number;
    message?: any;
    level?: string;
}
export class Logger {
    private options: Options = {
        app: 'app-name',
        env: 'development',
    };
    public setOptions(options: Options) {
        this.options = options;
    }

    public getOptions(): Options {
        return this.options;
    }

    public async access(ctx: Router.IRouterContext, next: () => Promise<any>) {
        const started = Date.now();
        let ellapsed = 0;
        try {
            await next();
            ellapsed = Date.now() - started;
        } catch (err: any) {
            // log uncaught downstream errors
            this.internalLog({
                route: ctx.request.url,
                method: <any>ctx.request.method,
                resCode: err.status || 500,
                resTime: ellapsed,
                level: 'error',
                message: err.message,
            });
            ctx.status = err.status || 500;
            ctx.body = err.message;
            ctx.app.emit('error', err, ctx);
            return;
        }
        this.internalLog({
            route: ctx.request.url,
            method: <any>ctx.request.method,
            resCode: ctx.response.status,
            resTime: ellapsed,
            level: 'info',
        });
        return;
    }

    public log(level: string, message: any) {
        this.internalLog({ level, message });
    }

    private internalLog(log: Log) {
        const finalLog: Log = {
            date: new Date(),
            app: this.options.app,
            ...log,
        };
        if (this.options.env === 'development') {
            // Log pretty to stdout (dev mode)
            console.log(finalLog);
        } else {
            // Log result to stdout
            console.log(JSON.stringify(finalLog));
            // Create date based index
            const d = new Date();
            const date = [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-');
            const index = `gumbopdf-${date}`;
            // Send json log to ES
            request
                .post(`http://elasticsearch:9200/${index}/_doc`)
                .send(finalLog)
                .catch((err: any) => {
                    // Dont do anything
                });
        }
    }
}
