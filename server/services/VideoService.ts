import { inject, injectable, named } from 'inversify';
import { IConfig } from 'config';
import { Logger } from '../utilities/Logger';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { FSNode } from '../entities/FSNode';
import { swapFormat } from '../utilities/File';
import fs from 'fs';
import { NodeRepository } from '../repositories/NodeRepository';
import { Job } from 'bullmq';
import { StatsRepository } from '../repositories/StatsRepository';

@injectable()
export class VideoService {
  constructor(
    @inject('config') private config: IConfig,
    @inject('logger') private logger: Logger,
    @inject('Repository') @named('Node') private nodeRepository: NodeRepository,
    @inject('Repository') @named('Stats') private statsRepository: StatsRepository
  ) {}

  private getConvertPath(fileName: string): string {
    return `${this.config.get<string>('convertPath')}/${swapFormat(fileName, 'mp4')}`;
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
    switch (this.config.get<string>('targetCodec')) {
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
      node.path,
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
      counter++;
    });
    ffmpeg.on('close', (code: any) => {
      onClose(code);
    });
    ffmpeg.on('error', (err: Error) => {
      onError(err);
    });
    return ffmpeg;
  }

  public async preConversion(node: FSNode): Promise<void> {
    // Delete converted asset in conversion folder
    const path = this.getConvertPath(<string>node.name);
    if (fs.existsSync(path)) {
      await fs.rmSync(this.getConvertPath(<string>node.name));
    }
  }

  public async postConversion(job: Job, node: FSNode): Promise<void> {
    try {
      const originalNode = await this.nodeRepository.getNode(node.path, true);
      const newNode = await this.nodeRepository.getNode(
        this.getConvertPath(<string>node.name),
        true
      );
      if (newNode?.streams && newNode?.streams?.length > 0) {
        try {
          // Copy converted asset
          await fs.promises.copyFile(
            this.getConvertPath(<string>node.name),
            swapFormat(node.path, 'mp4')
          );
          // Delete converted asset in conversion folder
          await fs.promises.rm(this.getConvertPath(<string>node.name));
          // Delete old asset
          await fs.promises.rm(node.path);
          // Finally lets save complete job stats
          this.statsRepository.save(job, originalNode, newNode);
        } catch (err) {
          throw new Error('Could not move file.');
        }
      } else {
        throw new Error('No streams found.');
      }
    } catch (err) {
      console.log(err);
      throw new Error('Converted video is not valid.');
    }
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
