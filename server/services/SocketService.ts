import { inject, injectable } from 'inversify';
import { IConfig } from 'config';
import { Logger } from '../utilities/Logger';
import { Socket } from 'socket.io';

@injectable()
export class SocketService {
    private socket: Socket;
    constructor(
        @inject('config') private config: IConfig,
        @inject('logger') private logger: Logger,
    ) { }

    public setSocket(socket: Socket): void {
        this.socket = socket;
    }

    public seed(seed: { [key: string]: string[] }): void {
        console.log('emitting seed bro!', seed)
        this.socket.emit('seed', seed);
    }
}
