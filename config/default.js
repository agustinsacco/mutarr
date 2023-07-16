
module.exports = {
    env: process.env.NODE_ENV || 'production',
    app: {
        name: process.env.APP_NAME || 'mutarr',
    },
    watchPath: '/mutarr/watch',
    convertPath: '/tmp',
    conversionConfig: {
        concurrency: process.env.CONVERSION_CONCURRENCY,
        codec: 'h265'
    },
    videoFormats: ['mp4', 'avi', 'mkv', 'mov'],
    server: {
        host: process.env.SERVER_HOST ? process.env.SERVER_HOST : '0.0.0.0',
        port: process.env.SERVER_PORT ? +process.env.SERVER_PORT : 3000,
    },
    redis: {
        host: process.env.REDIS_HOST ? process.env.REDIS_HOST : 'redis',
        port: process.env.REDIS_PORT ? +process.env.REDIS_PORT : 6379,
    },
    
};
