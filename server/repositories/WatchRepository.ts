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
        @inject('Service') @named('Socket') private socketService: SocketService,
        @inject('Repository') @named('Node') private nodeRepository: NodeRepository,
    ) { }

    public async initialize(): Promise<void> {
        chokidar.watch(this.config.get<string>('watchPath'), {
            ignoreInitial: true,
            usePolling: true
        }).on('ready', () => {
            console.log('info', 'Watching folders for changes');
        }).on('all', async (event, path) => {
            // console.log(event, path);
            const nodes = await this.nodeRepository.refreshNodes();
            this.socketService.nodesRefresh(nodes);
        });
    }
}
