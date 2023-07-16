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
import { bytesToReadable, readableToBytes } from '../utilities/Bytes';
import { Stats } from '../entities/Stats';


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

    public async getNodes(streams: boolean = false): Promise<FSNode[]> {
        if (this.nodes) {
            return this.nodes;
        }
        this.nodes = await this.parseNodes(this.path, streams);
        return this.nodes;
    }

    public async getNode(path: string, streams: boolean = false): Promise<FSNode> {
        const stat = await promises.stat(path);
        let rawNode: FSNode = {
            path: path,
            type: stat.isFile() ? FSNodeType.FILE : FSNodeType.DIR,
        }
        if (stat.isFile()) {
            const format = getFileFormat(<string>path);
            // Set size
            rawNode = {
                ...rawNode,
                size: bytesToReadable(stat.size)
            }
            // Get file streams
            if (streams) {
                // Check if we should get streams for this video format
                if (this.config.get<string>('videoFormats').includes(format)) {
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
            }


        }
        return await this.fsNodeModel.create(rawNode);
    }

    public async getFreshNodes(): Promise<FSNode[]> {
        this.nodes = await this.parseNodes(this.path);
        return this.nodes;
    }

    private async parseNodes(dir: string, streams: boolean = false): Promise<FSNode[]> {
        // Read the directory
        const entries = await promises.readdir(dir);
        const fsNodes: FSNode[] = [];
        for (const entry of entries) {
            const entryDir = path.resolve(dir, entry)
            const node = await this.getNode(entryDir, streams);
            if (node.type === FSNodeType.DIR) {
                node.children = await this.parseNodes(entryDir, streams)
                fsNodes.push(node);
            } else if (node.type === FSNodeType.FILE) {
                fsNodes.push(node);
            }
        }
        return fsNodes;
    }


    public async getNodeStats(): Promise<Stats> {
        let stats: Stats = {
            directories: {
                count: 0
            },
            files: {
                count: 0,
                totalSize: 0,
                avgSize: 0,
                codecs: []
            }
        }
        const nodes = await this.getNodes(true);
        this.parseNodeStats(nodes, stats);
        // Reable bytes for frontend
        stats = {
            ...stats,
            files: {
                ...stats.files,
                totalSize: bytesToReadable(<number>stats.files.totalSize),
                avgSize: bytesToReadable(<number>stats.files.avgSize),
                codecs: stats.files.codecs.map(codec => {
                    return {
                        ...codec,
                        size: bytesToReadable(<number>codec.size)
                    }
                })
            }
        }
        return stats;
    }

    private parseNodeStats(nodes: FSNode[], stats: Stats) {
        for (const node of nodes) {
            if (node.type === FSNodeType.DIR) {
                stats.directories.count++
                this.parseNodeStats(node.children, stats)
            } else if (node.type === FSNodeType.FILE) {
                const bytes = readableToBytes(node.size);
                stats.files.count++;
                stats.files.avgSize = (<number>stats.files.avgSize + bytes) / stats.files.count;
                stats.files.totalSize += <any>bytes;
                const videoStream = node?.streams?.find(stream => stream.codec_type === 'video');
                if (videoStream) {
                    const codecStat = stats.files.codecs.find(codec => codec.name == videoStream.codec_name);
                    // Check if codec has been added
                    if (codecStat) {
                        codecStat.count++;
                        codecStat.size += <any>bytes;
                    } else {
                        stats.files.codecs.push({
                            name: videoStream.codec_name,
                            count: 1,
                            size: bytes
                        })
                    }
                }

            }
        }
    }
}
