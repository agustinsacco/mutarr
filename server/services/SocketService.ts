import { inject, injectable } from 'inversify';
import { IConfig } from 'config';
import { Logger } from '../utilities/Logger';
import { Server } from 'socket.io';
import Queue from 'bull';
import { Socket } from 'socket.io-client';

@injectable()
export class SocketService {
    private server: Server;
    constructor(
        @inject('config') private config: IConfig,
        @inject('logger') private logger: Logger,
    ) { }

    public setServer(server: Server): void {
        this.server = server;
        // this.server.on("connection", this.onConnection);
    }

    // private onConnection(socket: Socket) {
    //     socket.on("ping", () => {
    //         console.log('received ping from client')
    //     });
    // }

    public seed(seed: { [key: string]: string[] }): void {
        this.server.emit('seed', seed);
    }

    public jobEvent(job: Queue.Job): void {
        console.log('sent jobEvent!')
        this.server.emit('job', job);
    }
}

enum VideoJobStatus {
    CONVERTING = 'CONVERTING',
    COMPLETE = 'COMPLETE',
    FAILURE = 'FAILURE',
}

interface VideoJobEvent {
    id: number;
    status: VideoJobStatus;
    data?: {
        [key: string]: string
    },
    message?: string
}