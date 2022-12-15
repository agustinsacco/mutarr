import koaBody from 'koa-body';
import koaCors from '@koa/cors';
import cookie from 'koa-cookie';
import Koa from 'koa';
import { InversifyKoaServer } from 'inversify-koa-utils';
import { container } from './Registry';
import { IConfig } from 'config';
import { Repository } from './repositories/Repository';
import shutdown from 'koa-graceful-shutdown';
import Router from 'koa-router';
import { Logger } from './utilities/Logger';
import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
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
        await this.startServer();
        // Start socket server
        const socket = await this.startSocket();
        // Set socket in service
        const socketService = container.getNamed<SocketService>('Service', 'Socket');
        socketService.setSocket(socket);
    }

    public async startServer(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.nextApp.prepare().then(async () => {
                // Set up cookie parser middleware
                // Set up shopify auth
                let inversifyKoaServer = new InversifyKoaServer(container, undefined, undefined, this.koaServer);
                inversifyKoaServer.setConfig((app: any) => {
                    app.use((ctx: Router.IRouterContext, next: () => Promise<any>) => {
                        return this.logger.access(ctx, next);
                    });
                    app.use(koaBody());
                    app.use(cookie());
                    app.use(koaCors());
                    app.use(shutdown(inversifyKoaServer));
                });
                const port = this.config.get<number>('server.port');
                const host = this.config.get<string>('server.host');
                const app = inversifyKoaServer.build();
                // Init repositories
                // await this.initRepositories();
                app.listen(port, host, () => {
                    console.log(`Main server started http://${host}:${port}`);
                    resolve();
                });
            });
        });
    }

    public async startSocket(): Promise<Socket> {
        return new Promise((resolve, reject) => {
            const httpServer = createServer(this.koaSocketServer.callback());
            const io = new Server(httpServer, {
                cors: {
                    origin: "*",
                    methods: ["GET", "POST"],
                }
            });

            const port = this.config.get<number>('server.socketPort');
            const host = this.config.get<string>('server.host');

            httpServer.listen(port, () => {
                console.log(`Socket server started http://${host}:${port}`);
                io.on("connection", (socket: Socket) => {
                    console.log('socketListen connected!')
                    socket.on("ping", () => {
                        console.log('received ping from client')
                    });
                    resolve(<Socket>socket);
                });
            });
        });
    }

    private async initializeRepositories(): Promise<void> {
        const repositories = container.getAll<Repository>('Repository');
        for (const r of repositories) {
            await r.initialize();
        }
    }
}
