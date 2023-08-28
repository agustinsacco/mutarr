import { Job } from "bullmq"
import { FSNode } from "./FSNode"

export interface Stats {
    directories: {
        count: number
    }
    files: {
        count: number,
        totalSize: number | string,
        avgSize: number | string,
        codecs: CodecStats[]
    }
}

interface CodecStats {
    name: string,
    count: number,
    size: number | string
}


export interface JobStats {
    timestamp: string;
    job: Job;
    originalNode: FSNode;
    newNode: FSNode;
  }