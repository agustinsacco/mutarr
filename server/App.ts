import koaBody from 'koa-body';
import koaCors from '@koa/cors';
import cookie from 'koa-cookie';
import Koa from 'koa';
import { InversifyKoaServer } from 'inversify-koa-utils';
import { container } from './Registry';
import { IConfig } from 'config';
import { Repository } from './repositories/Repository';
import shutdown from 'koa-graceful-shutdown';
import { Logger } from './utilities/Logger';
import { Server as SocketServer, Socket } from 'socket.io';
import { createServer, Server as HttpServer } from 'http';
import { SocketService } from './services/SocketService';

export class App {
    private config: IConfig;
    private nextApp: any;
    private koaServer = new Koa();
    private koaSocketServer = new Koa();
    private logger: Logger = container.get<Logger>('logger');

    constructor() {
        this.config = container.get<IConfig>('config');
        this.nextApp = container.get<any>('next');
    }

    public async start(): Promise<void> {
        // Initialize repositories
        await this.initializeRepositories();
        // Start Next server
        const startResult = await this.startServer();
        // Start socket server
        // const socket = await this.startSocket();
        // Set socket in service
        const socketService = container.getNamed<SocketService>('Service', 'Socket');
        socketService.setServer(startResult.io);
    }

    public async startServer(): Promise<{ server: HttpServer, io: SocketServer}> {
        return new Promise<{ server: HttpServer, io: SocketServer}>((resolve, reject) => {
            this.nextApp.prepare().then(async () => {
                // Prepare Invesify Koa Server
                let inversifyKoaServer = new InversifyKoaServer(container, undefined, undefined, this.koaServer);
                inversifyKoaServer.setConfig((app: any) => {
                    // app.use((ctx: Router.IRouterContext, next: () => Promise<any>) => {
                    //     return this.logger.access(ctx, next);
                    // });
                    app.use(koaBody());
                    app.use(cookie());
                    app.use(koaCors());
                    app.use(shutdown(inversifyKoaServer));
                });
                const port = this.config.get<number>('server.port');
                const host = this.config.get<string>('server.host');
                
                // Build final server with routes and middleware
                const app = inversifyKoaServer.build();

                // Create a generic HTTP server
                const server: HttpServer = createServer(app.callback());
                const io: SocketServer = new SocketServer();

                // Attach generic HTTP server to Socket IO
                io.attach(server);

                // Start server
                server.listen(port, host, () => {
                    this.logger.log('info', `Main server started http://${host}:${port}`);
                    resolve({
                        server: server,
                        io: io
                    });
                });
            });
        });
    }

    // public async startSocket(): Promise<Server> {
    //     return new Promise((resolve, reject) => {
    //         const httpServer = createServer(this.koaSocketServer.callback());
    //         const socket = new Server(httpServer, {
    //             cors: {
    //                 origin: "*",
    //                 methods: ["GET", "POST"],
    //             }
    //         });

    //         const port = this.config.get<number>('server.socketPort');
    //         const host = this.config.get<string>('server.host');

    //         httpServer.listen(port, () => {
    //             this.logger.log('info', `Socket server started http://${host}:${port}`);
    //             resolve(socket);
    //         });
    //     });
    // }

    private async initializeRepositories(): Promise<void> {
        const repositories = container.getAll<Repository>('Repository');
        for (const r of repositories) {
            await r.initialize();
        }
    }
}
