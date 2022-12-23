import ffprobe from 'ffprobe';
import { FFProbeResult } from 'ffprobe';
import ffprobeStatic from 'ffprobe-static';
import { injectable } from 'inversify';
import { FSNode, FSNodeType } from '../entities/FSNode';
import { getFileFormat, getFileName } from '../utilities/File';

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
        fsNode.name = getFileName(attr.path);
        if (attr.type === FSNodeType.FILE) {
            fsNode.format = getFileFormat(<string> fsNode.name);
            if (fsNode.format && videoFormats.includes(fsNode.format)) {
                fsNode.streams = (await this.getVideoProbe(attr.path)).streams
            }
        }
        if (attr?.children && attr.children.length > 0) {
            fsNode.children = attr.children;
        }
        return fsNode
    }

    private async getVideoProbe(path: string): Promise<FFProbeResult> {
        return await ffprobe(path, { path: ffprobeStatic.path });
    }
}
