import { inject, injectable, named } from 'inversify';
import { IConfig } from 'config';
import { Logger } from '../utilities/Logger';
import { Repository } from './Repository';
import { promises } from 'fs';
import { FSNodeModel } from '../models/FSNodeModel';
import path from 'path';
import { FSNode, FSNodeType } from '../entities/FSNode';

@injectable()
export class FileRepository implements Repository {
    private fsNodes: FSNode[];
    private path: string;
    constructor(
        @inject('config') private config: IConfig,
        @inject('logger') private logger: Logger,
        @inject('Model') @named('FSNode') private fsNodeModel: FSNodeModel,
    ) {
        this.path = this.config.get<string>('watchPath');
    }

    public async initialize(): Promise<void> { }

    public async getNodesCustom(): Promise<FSNode[]> {
        const path = this.config.get<string>('watchPath');
        const fsNodes = await this.parseNodes(path);
        return fsNodes;
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
                    type: FSNodeType.FILE,
                });
                fsNodes.push(node);
            }
        }
        return fsNodes;
    }
}
