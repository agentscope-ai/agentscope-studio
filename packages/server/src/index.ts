import express from 'express';
import { createServer } from 'http';
import * as trpcExpress from '@trpc/server/adapters/express';
import { initializeDatabase } from './database';
import { appRouter } from './trpc/router';
import { SocketManager } from './trpc/socket';
import { ConfigManager, APP_INFO } from '../../shared/src/config';
import path from 'path';
import opener from 'opener';
import { promptUser } from '../../shared/src/utils/terminal';
import portfinder from 'portfinder';
import otelRouter from './otel/router';
import { displayBanner } from '../../shared/src/utils/banner';

async function initializeServer() {
    try {
        // Initialize the configuration
        const configManager = ConfigManager.getInstance();
        const config = configManager.getConfig();

        portfinder.basePort = 3000;
        portfinder.highestPort = 5000;
        const availablePort = await portfinder.getPortPromise();

        if (availablePort !== config.port) {
            console.log(`Port ${config.port} is already in use.`);

            const useNewPort = await promptUser(
                `Would you like to start the server on port ${availablePort} instead? (y/n): `,
            );

            if (useNewPort) {
                await configManager.setPort(availablePort);
                console.log(`Server will start on port ${availablePort}`);
            } else {
                console.log('Exiting...');
                process.exit(1);
            }
        }

        // Create APP instance
        const app = express();
        const httpServer = createServer(app);

        // Initialize the database
        await initializeDatabase(config.database);
        console.log('✔ Database initialized successfully');

        // Set TRPC router
        app.use(
            '/trpc',
            trpcExpress.createExpressMiddleware({
                router: appRouter,
            }),
        );

        app.use(
            '/v1',
            express.raw({
                type: ['application/x-protobuf', 'application/json'],
                limit: '10mb',
            }),
            otelRouter,
        );

        // Initialize SocketManager
        SocketManager.init(httpServer);

        // Serve static files in development mode
        if (process.env.NODE_ENV === 'production') {
            const publicPath = path.join(__dirname, '../../public');
            app.use(express.static(publicPath));

            app.use((req, res, next) => {
                if (!req.path.startsWith('/trpc')) {
                    res.sendFile(path.join(publicPath, 'index.html'), {
                        dotfiles: 'allow',
                    });
                } else {
                    next();
                }
            });
        }

        httpServer.listen(configManager.getConfig().port, () => {
            const actualPort = configManager.getConfig().port;
            const config = configManager.getConfig();
            const mode = (process.env.NODE_ENV || 'production') as
                | 'development'
                | 'production';

            // Display startup banner
            displayBanner({
                appName: APP_INFO.name,
                version: APP_INFO.version,
                port: actualPort,
                databasePath: config.database.database,
                mode: mode,
            });

            if (process.env.NODE_ENV === 'production') {
                opener(`http://localhost:${actualPort}/home`);
            }
        });

        return httpServer;
    } catch (error) {
        console.error('Error initializing server:', error);
        console.error('Error stack:', (error as Error).stack);
        throw error;
    }
}

// Set up the server and start listening
initializeServer()
    .then((server) => {
        // Handle graceful shutdown
        const cleanup = () => {
            console.log('Closing Socket.IO connections');
            SocketManager.close();

            console.log('Closing HTTP server');
            server.close(() => {
                console.log('HTTP server closed');
                process.exit(0);
            });
        };

        process.on('SIGTERM', cleanup);
        process.on('SIGINT', cleanup);
    })
    .catch(() => {
        process.exit(1);
    });
