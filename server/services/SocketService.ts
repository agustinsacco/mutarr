import { inject, injectable } from 'inversify';
import { IConfig } from 'config';
import { Logger } from '../utilities/Logger';
import { Server, Socket } from 'socket.io';
import { JobCollection } from '../entities/JobCollection';
import { FSNode } from '../entities/FSNode';
import { Job } from 'bullmq';

@injectable()
export class SocketService {
    private server: Server;
    constructor(
        @inject('config') private config: IConfig,
        @inject('logger') private logger: Logger,
    ) { }

    public setServer(server: Server): void {
        this.server = server;
        this.server.on("connection", this.onConnection);
    }

    private onConnection(socket: Socket) {
    }

    public nodesRefresh(nodes: FSNode[]): void {
        this.server.emit('nodesRefresh', nodes);
    }

    public jobUpdate(job: Job): void {
        this.server.emit('jobUpdate', job);
    }

    public jobsRefresh(jobs: JobCollection): void {
        this.server.emit('jobsRefresh', jobs);
    }
}