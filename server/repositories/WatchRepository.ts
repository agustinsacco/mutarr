import { inject, injectable, named } from 'inversify';
import { IConfig } from 'config';
import chokidar from 'chokidar';
import { Logger } from '../utilities/Logger';
import ffmpeg from 'ffmpeg';
import { SocketService } from '../services/SocketService';
import { Repository } from './Repository';
import { NodeRepository } from './NodeRepository';
import { TranscodeQueueRepository } from './TranscodeQueueRepository';

export type File = string;

@injectable()
export class WatchRepository implements Repository {
  private event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';
  constructor(
    @inject('config') private config: IConfig,
    @inject('logger') private logger: Logger,
    @inject('Service') @named('Socket') private socketService: SocketService,
    @inject('Repository') @named('Node') private nodeRepository: NodeRepository,
    @inject('Repository')
    @named('TranscodeQueue')
    private transcodeQueue: TranscodeQueueRepository
  ) {}

  public async initialize(): Promise<void> {
    const path = this.config.get<string>('watch.path');
    chokidar
      .watch(path, {
        ignoreInitial: true,
        usePolling: true,
      })
      .on('ready', () => {
        this.logger.log('info', `Watching "${path}" for changes`);
      })
      .on('all', async (eventName: string, path: string) => {
        if (this.config.get<boolean>('watchEnabled') && eventName == 'add') {
          this.logger.log('info', `New node added: "${path}", enqueuing job now.`);

          try {
            const node = await this.nodeRepository.getNode(path, true);
            this.transcodeQueue.addJob(node);
          } catch (err: any) {
            this.logger.log(
              'error',
              `Unable to enqueue job for added node: "${path}" | ${err.message}`
            );
          }
        }
        this.logger.log('info', `Change event within "${path}", refreshing nodes`);
        const nodes = await this.nodeRepository.getFreshNodes();
        this.socketService.nodesRefresh(nodes);
      });
  }
}
