import { inject, injectable, named } from 'inversify';
import { IConfig } from 'config';
import { Logger } from '../utilities/Logger';
import { spawn } from 'child_process';
import { FSNode } from '../entities/FSNode';
import { swapFormat } from '../utilities/File';
import Queue from 'bull';
import { SocketService } from './SocketService';

@injectable()
export class VideoService {
    constructor(
        @inject('config') private config: IConfig,
        @inject('logger') private logger: Logger,
    ) { }

    public convert(job: Queue.Job, onStdout: Function, onClose: Function): any {
        const node = <FSNode> job.data;
        // TODO make this configurable from UI
        const ffmpeg = spawn('ffmpeg', [
            '-i',
            node.path,
            '-c:v',
            'libx265',
            '-c:a',
            'copy',
            swapFormat(node.path, 'mp4'),
            '-progress',
            'pipe:1'
        ]);
        ffmpeg.stdout.on('data', (data: string) => {
            const progress = this.parseFfmpegOutput(data);
            onStdout(progress);
        });
        ffmpeg.on('close', (code: any) => {
            ffmpeg.kill('SIGINT');
            onClose(code);
        });
        return ffmpeg;

    }

    private parseFfmpegOutput(data: string): { [key: string]: string } {
        const tLines = data.toString().split('\n');
        let progress: { [key: string]: string } = {};
        for (let i = 0; i < tLines.length; i++) {
            const item = tLines[i].split('=');
            if (typeof item[0] != 'undefined' && typeof item[1] != 'undefined') {
                progress[item[0]] = item[1];
            }
        }
        return progress;
    }
}
