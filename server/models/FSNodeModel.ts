import ffprobe from 'ffprobe';
import { FFProbeResult } from 'ffprobe';
import ffprobeStatic from 'ffprobe-static';
import { injectable } from 'inversify';
import { FSNode, FSNodeType } from '../entities/FSNode';

const videoFormats: string[] = ['mp4', 'avi', 'mkv', 'mov'];

@injectable()
export class FSNodeModel {

    public async create(attr: FSNode): Promise<FSNode> {
        let fsNode: FSNode = {
            type: attr.type,
            path: attr.path
        }
        ;
        fsNode.type = attr.type;
        fsNode.path = attr.path;
        if (attr.type === FSNodeType.FILE) {
            fsNode.name = this.extractName(attr.path);
            fsNode.format = this.extractFormat(fsNode.name);
            if (fsNode.format && videoFormats.includes(fsNode.format)) {
                fsNode.streams = await this.getVideoProbe(attr.path)
            }
        }
        if (attr?.children && attr.children.length > 0) {
            fsNode.children = attr.children;
        }
        return fsNode
    }

    private extractName(path: string): string {
        const split = path.split('/');
        return split[split.length - 1];
    }

    private extractFormat(name: string): string {
        const split = name.split('.');
        return split[split.length - 1];
    }

    private async getVideoProbe(path: string): Promise<any> {
        return await ffprobe(path, { path: ffprobeStatic.path })
    }
}
