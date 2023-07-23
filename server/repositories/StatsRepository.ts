import { inject, injectable, named } from 'inversify';
import { IConfig } from 'config';
import { Logger } from '../utilities/Logger';
import { Repository } from './Repository';
import { NodeRepository } from './NodeRepository';
import { FSNode } from '../entities/FSNode';
import { existsSync, readdirSync, writeFileSync, mkdirSync, readFileSync } from 'fs';
import { Job } from 'bullmq';
import path from 'path';

interface JobStats {
  timestamp: string;
  job: Job;
  originalNode: FSNode;
  newNode: FSNode;
}
@injectable()
export class StatsRepository implements Repository {
  private statsPath: string = this.config.get<string>('stats.path');
  constructor(
    @inject('config') private config: IConfig,
    @inject('logger') private logger: Logger,
    @inject('Repository') @named('Node') private nodeRepository: NodeRepository
  ) {}

  public async initialize(): Promise<void> {
    if (!existsSync(this.statsPath)) {
      mkdirSync(this.statsPath, { recursive: true });
    }
  }

  private getPath(jobId: string): string {
    return `${this.statsPath}/${jobId}.stat`;
  }

  public async save(job: Job, originalNode: FSNode, newNode: FSNode): Promise<void> {
    try {
      // Make sure stats dont already exist
      const dir = this.getPath(job.id);
      if (!existsSync(dir)) {
        writeFileSync(
          dir,
          JSON.stringify({
            timestame: new Date(),
            job: job,
            originalNode: originalNode,
            newNode: newNode,
          })
        );
      }
    } catch (err) {
      console.log(err);
    }
  }

  public async getAll(): Promise<any> {
    const stats: any[] = [];
    try {
      // Read the list of files in the directory
      const statFiles = readdirSync(this.statsPath);
      // Iterate through the file names and read the contents of each file
      statFiles.forEach((fileName: string) => {
        const filePath = path.join(this.statsPath, fileName);
        const fileContent = readFileSync(filePath, 'utf-8');
        const rawStats = JSON.parse(fileContent);
        // Lets generate some stats
        // Get old file size
        // Get new file size
        // Get total space saved
        stats.push(rawStats);
      });
      return stats;
    } catch (err) {
      console.log(err);
    }
  }
}
