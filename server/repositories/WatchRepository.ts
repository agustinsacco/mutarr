import { inject, injectable, named } from 'inversify';
import { IConfig } from 'config';
import chokidar from 'chokidar';
import { Logger } from '../utilities/Logger';
import ffmpeg from 'ffmpeg';
import { SocketService } from '../services/SocketService';
import { Repository } from './Repository';
import { NodeRepository } from './NodeRepository';

export type File = string


@injectable()
export class WatchRepository implements Repository {
    private event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';
    constructor(
        @inject('config') private config: IConfig,
        @inject('logger') private logger: Logger,
        @inject('Service') @named('Socket') private socketService: SocketService,
        @inject('Repository') @named('Node') private nodeRepository: NodeRepository,
    ) { }

    public async initialize(): Promise<void> {
        const path = this.config.get<string>('watchPath');
        chokidar.watch(path, {
            ignoreInitial: true,
            usePolling: true
        }).on('ready', () => {
            this.logger.log('info', `Watching "${path}" for changes`);
        }).on('all', async () => {
            this.logger.log('info', `Change event within "${path}", refreshing nodes`);
            const nodes = await this.nodeRepository.getFreshNodes();
            this.socketService.nodesRefresh(nodes);
        });
    }
}
