// Inversify stuff
import "reflect-metadata";
import next from "next";
import { Container } from "inversify";
import { interfaces, TYPE } from "inversify-koa-utils";

// Common helpers
import config from "config";
import { IConfig } from "config";

// declare metadata by @controller annotation
import { RenderController } from "./controllers/RenderController";
import { HealthController } from "./controllers/HealthController";
import { QueueController } from "./controllers/QueueController";
import { Logger } from "./utilities/Logger";
import { WatchRepository } from "./repositories/WatchRepository";
import { SocketService } from "./services/SocketService";
import { NodeRepository } from "./repositories/NodeRepository";
import { NodeController } from "./controllers/NodeController";
import { FSNodeModel } from "./models/FSNodeModel";
import { TranscodeQueueRepository } from "./repositories/TranscodeQueueRepository";
import { VideoService } from "./services/VideoService";
import { TranscodeProcessor } from "./processors/TranscodeProcessor";
import Redis from "ioredis";

// Create global Registry
const container = new Container();

// Redis
const redisUrl = `${config.get<string>('redis.host')}:${config.get<string>('redis.port')}`;
const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  db: 0,
});

container.bind<Redis>("Redis").toConstantValue(redisConnection);

const publisherConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  db: 1,
});

container.bind<Redis>("Publisher").toConstantValue(publisherConnection);

const subscriberConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  db: 1,
});

// Controllers (in order_)
container
  .bind<interfaces.Controller>(TYPE.Controller)
  .to(HealthController)
  .whenTargetNamed("HealthController");
container
  .bind<interfaces.Controller>(TYPE.Controller)
  .to(NodeController)
  .whenTargetNamed("NodeController");
container
  .bind<interfaces.Controller>(TYPE.Controller)
  .to(QueueController)
  .whenTargetNamed("QueueController");
container
  .bind<interfaces.Controller>(TYPE.Controller)
  .to(RenderController)
  .whenTargetNamed("RenderController");

// Services
container
  .bind<SocketService>("Service")
  .to(SocketService)
  .inSingletonScope()
  .whenTargetNamed("Socket");
container
  .bind<VideoService>("Service")
  .to(VideoService)
  .inSingletonScope()
  .whenTargetNamed("Video");
container
  .bind<TranscodeProcessor>("Service")
  .to(TranscodeProcessor)
  .inSingletonScope()
  .whenTargetNamed("Queue");

// Services
container
  .bind<FSNodeModel>("Model")
  .to(FSNodeModel)
  .inSingletonScope()
  .whenTargetNamed("FSNode");

// Repositories
container
  .bind<NodeRepository>("Repository")
  .to(NodeRepository)
  .inSingletonScope()
  .whenTargetNamed("Node");
container
  .bind<WatchRepository>("Repository")
  .to(WatchRepository)
  .inSingletonScope()
  .whenTargetNamed("Watch");
container
  .bind<TranscodeQueueRepository>("Repository")
  .to(TranscodeQueueRepository)
  .inSingletonScope()
  .whenTargetNamed("TranscodeQueue");

// Utils
container.bind<IConfig>("config").toConstantValue(config);

const logger = new Logger();
logger.setOptions({
  app: "mutarr",
  env: config.get<"production" | "development">("env"),
});
container.bind<Logger>("logger").toConstantValue(logger);

// Next
const nextApp = next({
  dev: config.get<string>("env") !== "production",
});
container.bind<any>("next").toConstantValue(nextApp);

export { container };
