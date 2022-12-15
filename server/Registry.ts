// Inversify stuff
import 'reflect-metadata';
import next from 'next';
import { Container } from 'inversify';
import { interfaces, TYPE } from 'inversify-koa-utils';

// Common helpers
import config from 'config';
import { IConfig } from 'config';


// declare metadata by @controller annotation
import { RenderController } from './controllers/RenderController';
import { HealthController } from './controllers/HealthController';
import { Logger } from './utilities/Logger';
import { WatchRepository } from './repositories/WatchRepository';
import { SocketService } from './services/SocketService';
import { FileRepository } from './repositories/FileRepository';
import { NodeController } from './controllers/NodeController';
import { FSNodeModel } from './models/FSNodeModel';

// Create global Registry
const container = new Container();

// Controllers (in order_)
container.bind<interfaces.Controller>(TYPE.Controller).to(HealthController).whenTargetNamed('HealthController');
container.bind<interfaces.Controller>(TYPE.Controller).to(NodeController).whenTargetNamed('NodeController');
container.bind<interfaces.Controller>(TYPE.Controller).to(RenderController).whenTargetNamed('RenderController');

// Services
container.bind<SocketService>('Service').to(SocketService).inSingletonScope().whenTargetNamed('Socket');

// Services
container.bind<FSNodeModel>('Model').to(FSNodeModel).inSingletonScope().whenTargetNamed('FSNode');

// Repositories
container.bind<FileRepository>('Repository').to(FileRepository).inSingletonScope().whenTargetNamed('File');
container.bind<WatchRepository>('Repository').to(WatchRepository).inSingletonScope().whenTargetNamed('Watch');

// Utils
container.bind<IConfig>('config').toConstantValue(config);

const logger = new Logger();
logger.setOptions({
    app: 'gumbopdf',
    env: config.get<'production' | 'development'>('env'),
});
container.bind<Logger>('logger').toConstantValue(logger);

// Next
const nextApp = next({
    dev: config.get<string>('env') !== 'production',
});
container.bind<any>('next').toConstantValue(nextApp);

export { container };
