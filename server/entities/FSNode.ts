export enum FSNodeType {
    FILE = 'FILE',
    DIR = 'DIR'
}

export interface FSNode {
    type: FSNodeType;
    path: string;
    name?: string;
    size?: number;
    format?: string;
    streams?: any[];
    children?: FSNode[];
}