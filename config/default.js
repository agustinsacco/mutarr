module.exports = {
    env: process.env.NODE_ENV || 'production',
    app: {
        name: process.env.APP_NAME || 'gumbopdf',
    },
    watchPath: '/mutarr/watch',
    convertPath: '/mutarr/tmp',
    server: {
        host: process.env.SERVER_HOST ? process.env.SERVER_HOST : '0.0.0.0',
        port: process.env.SERVER_PORT ? +process.env.SERVER_PORT : 3000,
        socketPort: process.env.SERVER_SOCKET_PORT ? +process.env.SERVER_SOCKET_PORT : 3001,
    },
};
