import { FFProbeStream } from "ffprobe";
import { getFileFormat, getFileName } from "../utilities/File";

export enum FSNodeType {
    FILE = 'FILE',
    DIR = 'DIR'
}

export class FSNode {
    public type: FSNodeType;
    public path: string;
    public name?: string;
    public size?: string;
    public format?: string;
    public streams?: FFProbeStream[];
    public children?: FSNode[];

    constructor(
        type: FSNodeType,
        path: string,
        name?: string,
        size?: string,
        format?: string,
        streams?: FFProbeStream[],
        children?: FSNode[],
    ) {
        let fsNode: FSNode = {
            type: type,
            path: path
        }
        ;
        fsNode.type = type;
        fsNode.path = path;
        fsNode.size = size;
        fsNode.name = getFileName(path);
        fsNode.format = getFileFormat(fsNode.name);

        if (streams) {
            fsNode.streams = streams;
        }
        if (children && children.length > 0) {
            fsNode.children = children;
        }
        return fsNode;
    }

    public getVideoStream?() {
        return this.streams?.find(stream => stream.codec_type === 'video');
    }
}