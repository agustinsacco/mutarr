import Queue from "bull";

export interface JobCollection {
    active: Queue.Job<any>[],
    delayed: Queue.Job<any>[],
    completed: Queue.Job<any>[],
    failed: Queue.Job<any>[],
    waiting: Queue.Job<any>[],
}