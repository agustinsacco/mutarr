import { FFProbeStream } from 'ffprobe';
import { getFileFormat, getFileName } from '../utilities/File';

export enum FSNodeType {
  FILE = 'FILE',
  DIR = 'DIR',
}

export class FSNode {
  public type: FSNodeType;
  public path: string;
  public name?: string;
  public size?: string;
  public format?: string;
  public streams?: FFProbeStream[];
  public children?: FSNode[];

  constructor(rawNode: {
    type: FSNodeType;
    path: string;
    name?: string;
    size?: string;
    streams?: FFProbeStream[];
    children?: FSNode[];
  }) {
    this.type = rawNode?.type;
    this.path = rawNode?.path;
    this.size = rawNode?.size;
    this.name = rawNode?.path && getFileName(rawNode.path);
    this.format = rawNode?.name && getFileFormat(rawNode.name);

    if (rawNode?.streams) {
      this.streams = rawNode.streams;
    }
    if (rawNode?.children && rawNode.children.length > 0) {
      this.children = rawNode.children;
    }
  }

  public getVideoStream?() {
    return this.streams?.find((stream) => stream.codec_type === 'video');
  }
}
