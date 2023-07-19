import { Job } from 'bullmq';

export interface JobCollection {
  active: Job<any>[];
  delayed: Job<any>[];
  completed: Job<any>[];
  failed: Job<any>[];
  waiting: Job<any>[];
}
