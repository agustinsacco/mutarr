import 'reflect-metadata';

function uncaughtException(err: Error): void {
    console.error(err.message, ['uncaught', 'exception']);
    process.exit(1);
}

process.on(<any>'unhandledRejection', (reason: string, p: Promise<any>) => {
    console.error(`Unhandled Rejection at: Promise', ${JSON.stringify(p)}, reason: ${reason}`, ['unhandled', 'rejection']);
});

process.on('uncaughtException', uncaughtException);

import { App } from './App';
const app = new App();

app.start().catch(uncaughtException);
