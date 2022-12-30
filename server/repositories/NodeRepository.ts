import { inject, injectable, named } from 'inversify';
import { IConfig } from 'config';
import { Logger } from '../utilities/Logger';
import { Repository } from './Repository';
import { promises } from 'fs';
import { FSNodeModel } from '../models/FSNodeModel';
import ffprobe from 'ffprobe';
import ffprobeStatic from 'ffprobe-static';
import path from 'path';
import { FSNode, FSNodeType } from '../entities/FSNode';
import { getFileFormat } from '../utilities/File';


@injectable()
export class NodeRepository implements Repository {
    private nodes: FSNode[];
    private path: string;
    constructor(
        @inject('config') private config: IConfig,
        @inject('logger') private logger: Logger,
        @inject('Model') @named('FSNode') private fsNodeModel: FSNodeModel,
    ) {
        this.path = this.config.get<string>('watchPath');
    }

    public async initialize(): Promise<void> {
    }

    public async getNodes(): Promise<FSNode[]> {
        if (this.nodes) {
            return this.nodes;
        }
        this.nodes = await this.parseNodes(this.path);
        return this.nodes;
    }

    public async getFileNode(path: string): Promise<FSNode> {
        const format = getFileFormat(<string>path);
        const stat = await promises.stat(path);
        let rawNode: FSNode = {
            path: path,
            type: FSNodeType.FILE,
            size: stat.size
        }
        if (format && this.config.get<string>('videoFormats').includes(format)) {
            try {
                const streams = (await ffprobe(path, { path: ffprobeStatic.path }))?.streams;
                if (streams) {
                    rawNode = {
                        ...rawNode,
                        streams: streams
                    }
        
                }
            } catch (err) {
                this.logger.log('error', 'Error getting streams for file node');
            }
        }
        return await this.fsNodeModel.create(rawNode);
    }

    public async getNode(path: string): Promise<FSNode> {
        return await this.fsNodeModel.create({
            path: path,
            type: FSNodeType.FILE,
        });
    }

    public async refreshNodes(): Promise<FSNode[]> {
        this.nodes = await this.parseNodes(this.path);
        return this.nodes;
    }

    private async parseNodes(dir: string): Promise<FSNode[]> {
        // Read the directory
        const entries = await promises.readdir(dir);
        const fsNodes: FSNode[] = [];
        for (const entry of entries) {
            const entryDir = path.resolve(dir, entry)
            const stat = await promises.stat(entryDir);
            if (stat.isDirectory()) {
                const node = await this.fsNodeModel.create({
                    path: entryDir,
                    type: FSNodeType.DIR,
                    children: await this.parseNodes(entryDir)
                });
                fsNodes.push(node);
            } else if (stat.isFile()) {
                const node = await this.fsNodeModel.create({
                    path: entryDir,
                    size: stat.size,
                    type: FSNodeType.FILE,
                });
                fsNodes.push(node);
            }
        }
        return fsNodes;
    }
}
