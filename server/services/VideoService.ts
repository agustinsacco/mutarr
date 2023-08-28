import {
  inject,
  injectable,
  named,
} from 'inversify';
import { IConfig } from 'config';
import { Logger } from '../utilities/Logger';
import {
  spawn,
  ChildProcessWithoutNullStreams,
} from 'child_process';
import { FSNode } from '../entities/FSNode';
import { swapFormat } from '../utilities/File';
import {
  existsSync,
  copyFileSync,
  rmSync,
} from 'fs';
import { NodeRepository } from '../repositories/NodeRepository';
import { Job } from 'bullmq';
import { StatsRepository } from '../repositories/StatsRepository';

@injectable()
export class VideoService {
  constructor(
    @inject('config') private config: IConfig,
    @inject('logger') private logger: Logger,
    @inject('Repository')
    @named('Node')
    private nodeRepository: NodeRepository,
    @inject('Repository')
    @named('Stats')
    private statsRepository: StatsRepository
  ) {}

  private getTmpPath(fileName: string): string {
    return `${this.config.get<string>(
      'convertPath'
    )}/${fileName}`;
  }

  private getConvertPath(
    fileName: string
  ): string {
    return `${this.config.get<string>(
      'convertPath'
    )}/${swapFormat(fileName, 'mp4')}`;
  }

  public convert(
    node: FSNode,
    onUpdate: Function,
    onClose: Function,
    onError: Function
  ): ChildProcessWithoutNullStreams {
    const name = <string>node.name;
    let ffmpegCodecOption: string;
    let ffmpegAudioOption: string;
    switch (
      this.config.get<string>('targetCodec')
    ) {
      case 'h265':
        ffmpegCodecOption = 'libx265';
        ffmpegAudioOption = 'copy';
        break;
      case 'h264':
        ffmpegCodecOption = 'libx264';
        ffmpegAudioOption = 'aac';
        break;
    }
    const options = [
      '-i',
      this.getTmpPath(node.name),
      '-c:v',
      ffmpegCodecOption,
      '-c:a',
      ffmpegAudioOption,
      this.getConvertPath(name),
      '-progress',
      'pipe:1',
    ];
    console.log(`ffmpeg ${options.join(' ')}`);
    const ffmpeg = spawn('ffmpeg', options);
    let counter = 0; // Used to limit the amount of stdout we are emitting
    ffmpeg.stdout.on('data', (data: string) => {
      if (counter % 2 === 0) {
        onUpdate(this.parseFfmpegOutput(data));
      }
      data = '';
      counter++;
    });
    ffmpeg.stderr.on('data', (data: string) => {
      data = '';
    });
    ffmpeg.stdin.on('data', (data: string) => {
      data = '';
    });
    ffmpeg.on('close', (code: any) => {
      onClose(code);
    });
    ffmpeg.on('error', (err: Error) => {
      onError(err);
    });
    return ffmpeg;
  }

  public async preConversion(
    node: FSNode
  ): Promise<void> {
    // Erase potentially previously attempted conversion
    const convertPath = this.getConvertPath(
      <string>node.name
    );
    if (existsSync(convertPath)) {
      this.logger.log('info', `Removing old convert attempt (partially converted file): ${convertPath}`);
      await rmSync(convertPath);
    }

    // Erase potentially previously copied file (original)
    const tmpOriginalPath = this.getTmpPath(node.name);
    if (existsSync(tmpOriginalPath)) {
      this.logger.log('info', `Removing old convert attempt (original file): ${tmpOriginalPath}`);
      await rmSync(tmpOriginalPath);
    }

    // Copy original file to tmp to avoid trancoding through network
    this.logger.log('info', `Copying in original file: ${tmpOriginalPath}`);
    await copyFileSync(
      node.path,
      tmpOriginalPath
    );
    this.logger.log('info', `Completed copying file: ${tmpOriginalPath}`);
  }

  public async postConversion(
    job: Job,
    node: FSNode
  ): Promise<void> {
    try {
      // Get original file (copied to tmp)
      const originalNode =
        await this.nodeRepository.getNode(
          this.getTmpPath(node.name),
          true
        );
      // Get newly converted file (in tmp)
      const newNode =
        await this.nodeRepository.getNode(
          this.getConvertPath(node.name),
          true
        );
      if (
        newNode?.streams &&
        newNode?.streams?.length > 0
      ) {
        try {
          // Copy converted asset backl to original location
          await copyFileSync(
            this.getConvertPath(node.name),
            swapFormat(node.path, 'mp4')
          );
          // Delete converted asset in tmp folder
          await rmSync(
            this.getConvertPath(node.name)
          );
          // Delete original asset in tmp folder
          await rmSync(
            this.getTmpPath(node.name)
          );
          // Delete original asset
          await rmSync(node.path);
          // Finally lets save complete job stats
          this.statsRepository.save(
            job,
            originalNode,
            newNode
          );
        } catch (err) {
          throw new Error('Could not move file.');
        }
      } else {
        throw new Error('No streams found.');
      }
    } catch (err) {
      console.log(err);
      throw new Error(
        'Converted video is not valid.'
      );
    }
  }

  private parseFfmpegOutput(data: string): {
    [key: string]: string;
  } {
    const tLines = data.toString().split('\n');
    let progress: { [key: string]: string } = {};
    for (let i = 0; i < tLines.length; i++) {
      const item = tLines[i].split('=');
      if (
        typeof item[0] != 'undefined' &&
        typeof item[1] != 'undefined'
      ) {
        progress[item[0]] = item[1];
      }
    }
    return progress;
  }
}
