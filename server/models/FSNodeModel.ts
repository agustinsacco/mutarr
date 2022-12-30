import { injectable } from 'inversify';
import { FSNode } from '../entities/FSNode';
import {  getFileFormat, getFileName } from '../utilities/File';

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
        fsNode.size = attr.size;
        fsNode.name = getFileName(attr.path);
        fsNode.format = getFileFormat(fsNode.name);

        if (attr?.streams) {
            fsNode.streams = attr.streams;
        }
        if (attr?.children && attr.children.length > 0) {
            fsNode.children = attr.children;
        }
        return fsNode;
    }

}
