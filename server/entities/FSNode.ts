export enum FSNodeType {
    FILE = 'FILE',
    DIR = 'DIR'
}

export interface FSNode {
    type: FSNodeType;
    path: string;
    name?: string;
    format?: string;
    streams?: any[];
    children?: FSNode[];
}