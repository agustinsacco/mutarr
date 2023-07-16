import { inject, injectable, named } from "inversify";
import { IConfig } from "config";
import { Logger } from "../utilities/Logger";
import { FSNode } from "../entities/FSNode";
import { VideoService } from "../services/VideoService";
import { SocketService } from "../services/SocketService";
import { TranscodeQueueRepository } from "../repositories/TranscodeQueueRepository";
import { Job } from "bullmq";
import { EventEmitter } from "events";
import { NodeRepository } from "../repositories/NodeRepository";
import { JobCollection } from "../entities/JobCollection";
import { AbstractProcessor } from "./AbstractProcessor";
import { Redis } from "ioredis";

@injectable()
export class TranscodeProcessor extends AbstractProcessor {

  constructor(
    @inject("logger") private logger: Logger,
    @inject("Service") @named("Video") private videoService: VideoService,
    @inject("Subscriber") subscriber: Redis
  ) {
    super(subscriber);
  }

  public async process(job: Job): Promise<{ message: string }> {
    const node: FSNode = <FSNode>job.data;

    try {
      this.logger.log("info", `Preconversion for ${job.id}`);
      await this.videoService.preConversion(node);
    } catch (err: any) {
      throw new Error(`preConversion failed with error ${err.message}`);
    }

    this.logger.log("info", `Conversion for ${job.id}`);
    const process = this.videoService.convert(
      node,
      // onUpdate
      async (data: { [key: string]: string }) => {
        job.log({
          ...job.data,
          progress: data,
        });
      },
      // onClose
      async (code: number) => {
        this.logger.log("info", `Completed ${job.id} with code: ${code}`);
        // Completed successfully
        if (code == 0) {
          // Run post conversion
          try {
            this.logger.log("info", `Post conversion for ${job.id}`);
            await this.videoService.postConversion(node);
            this.logger.log("info", `Completed ${job.id} with code: ${code}`);
            return;
          } catch (err: any) {
            this.logger.log(
              "error",
              `Post conversion for ${job.id} failed with error: ${err.message}`
            );
            throw new Error(
              `Post conversion for ${job.id} failed with error: ${err.message}`
            );
          }
        } else {
          this.logger.log(
            "error",
            `FFMPEG conversion for ${job.id} failed. Reason unknown.`
          );
          throw new Error(
            `FFMPEG conversion for ${job.id} failed. Reason unknown.`
          );
        }
      }
    );
    this.logger.log("info", `Saving process id ${process.pid} into ${job.id}`);
    // Save the process id in job metadata
    job.data({
      ...job.data,
      pid: process.pid,
    });
    return {
      message: "Completed ffmpeg conversion",
    };
  }

  private async processConversion(job: Job): Promise<void> {
    const node: FSNode = <FSNode>job.data;
    return new Promise(async (resolve, reject) => {
      try {
        this.logger.log("info", `Preconversion for ${job.id}`);
        await this.videoService.preConversion(node);
      } catch (err) {
        return reject(err);
      }

      this.logger.log("info", `Conversion for ${job.id}`);
      const process = this.videoService.convert(
        node,
        // onUpdate
        async (data: { [key: string]: string }) => {
          job.log({
            ...job.data,
            progress: data,
          });
        },
        // onClose
        async (code: number) => {
          this.logger.log("info", `Completed ${job.id} with code: ${code}`);
          // Completed successfully
          if (code == 0) {
            // Run post conversion
            try {
              this.logger.log("info", `Post conversion for ${job.id}`);
              await this.videoService.postConversion(node);
              this.logger.log("info", `Completed ${job.id} with code: ${code}`);
              return resolve();
            } catch (err: any) {
              this.logger.log(
                "error",
                `Post conversion for ${job.id} failed with error: ${err.message}`
              );
              throw new Error(
                `Post conversion for ${job.id} failed with error: ${err.message}`
              );
            }
          } else {
            this.logger.log(
              "error",
              `FFMPEG conversion for ${job.id} failed. Reason unknown.`
            );
            throw new Error(
              `FFMPEG conversion for ${job.id} failed. Reason unknown.`
            );
          }
        }
      );
      this.logger.log(
        "info",
        `Saving process id ${process.pid} into ${job.id}`
      );
      // Save the process id in job metadata
      job.data({
        ...job.data,
        pid: process.pid,
      });
    });
  }
}
