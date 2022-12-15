import { inject, injectable, named } from 'inversify';
import { IConfig } from 'config';
import chokidar from 'chokidar';
import { Logger } from '../utilities/Logger';
import ffmpeg from 'ffmpeg';
import { SocketService } from '../services/SocketService';
import { Repository } from './Repository';

export type File = string


@injectable()
export class WatchRepository implements Repository {
    private watched: any
    constructor(
        @inject('config') private config: IConfig,
        @inject('logger') private logger: Logger,
        @inject('Service') @named('Socket') private socketService: SocketService,
    ) { }

    public async initialize(): Promise<void> {
        const watcher = chokidar.watch(this.config.get<string>('watchPath'), {
            usePolling: true
        }).on('ready', () => {
            // console.log('Watcher service started. Watching:', watcher.getWatched());
            // this.socketService.seed(watcher.getWatched());
        }).on("all", async (event, path) => {
            // console.log(event, path);
            if (event === 'add') {
                // console.log(path)
                // Lets check the video codec
                // const codec = 
                // const metadata = await this.convertVideo(path);
                // console.log(metadata);
            }
        });
    }

    private convertVideo(path: string): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                const process = new ffmpeg(path);
                process.then((video: any) => {
                    console.log(path, video.metadata);
                    resolve(video.metadata);
                }, (err: any) => {
                    reject(err);
                    console.log('Error: ' + err);
                });
            } catch (err: any) {
                reject(err);
            }
        })

    }
}
