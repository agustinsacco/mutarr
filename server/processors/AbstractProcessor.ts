import { Job } from "bullmq";
import { inject, injectable } from "inversify";
import { Redis } from "ioredis";

export interface AlgoliaBatchImportOptions {
  env: "staging" | "prod";
  job: Job;
  algoliaIndex: string;
  opensearchIndex: string;
  mappingFn: (doc: unknown) => unknown;
}

@injectable()
export abstract class AbstractProcessor {
  constructor(@inject("Subscriber") private subscriber: Redis) {}

  /**
   * Abstract process function must be implemented
   * in concrete Processor class.
   * @param job
   */
  public abstract process(job: Job): Promise<{ message: string }>;

  /**
   * Abort is called at the same time as process to ensure
   * a cancellation of the job happens immediately.
   *
   * This function returns a promise that never resolves and will
   * reject if it receives a signal that the job must be terminated.
   * @param job
   * @returns
   */
  public async abort(job: Job): Promise<void> {
    return new Promise((resolve, reject) => {
      // Subscribe to abort messages
      this.subscriber.subscribe("abort", (err) => {
        if (err) {
          console.log("Failed to subscribe:", err);
          return;
        }
        console.log("Subscribed successfully! Listening for abort messages...");
      });

      // Listen for all job abort messages
      this.subscriber.on("message", (channel: string, message: string) => {
        if (channel === "abort" && message == job.id) {
          reject(
            new Error(`Job ${job.id} has been aborted before completion!`)
          );
        }
      });
    });
  }
}
