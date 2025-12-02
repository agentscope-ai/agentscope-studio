import * as trpcExpress from '@trpc/server/adapters/express';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import opener from 'opener';
import path from 'path';
import portfinder from 'portfinder';
import { ConfigManager, APP_INFO } from '../../shared/src/config';
import { promptUser } from '../../shared/src/utils/terminal';
import { initializeDatabase } from './database';
import { OtelGrpcServer } from './otel/grpc-server';
import otelRouter from './otel/router';
import { appRouter } from './trpc/router';
import { SocketManager } from './trpc/socket';
import { displayBanner } from '../../shared/src/utils/banner';

async function initializeServer() {
    try {
        // Initialize the configuration
        const configManager = ConfigManager.getInstance();
        const config = configManager.getConfig();

        portfinder.basePort = config.port;
        portfinder.highestPort = portfinder.basePort + 2000;
        // Handle HTTP port
        const availableHttpPort = await portfinder.getPortPromise();

        if (availableHttpPort !== config.port) {
            console.log(`HTTP port ${config.port} is already in use.`);

            // Check if running in interactive environment
            const isInteractive = process.stdin.isTTY && process.stdout.isTTY;

            let useNewPort: boolean;
            if (isInteractive) {
                useNewPort = await promptUser(
                    `Would you like to start the HTTP server on port ${availableHttpPort} instead? (y/n): `,
                );
            } else {
                // Non-interactive mode: automatically use available port
                console.log(
                    `Automatically using available HTTP port ${availableHttpPort} (non-interactive mode)`,
                );
                useNewPort = true;
            }

            if (useNewPort) {
                await configManager.setPort(availableHttpPort);
                console.log(
                    `HTTP server will start on port ${availableHttpPort}`,
                );
            } else {
                console.log('Exiting...');
                process.exit(1);
            }
        }

        // Handle gRPC port
        portfinder.basePort = config.grpcPort;
        portfinder.highestPort = portfinder.basePort + 2000;

        const availableGrpcPort = await portfinder.getPortPromise();

        if (availableGrpcPort !== config.grpcPort) {
            console.log(`gRPC port ${config.grpcPort} is already in use.`);

            // Check if running in interactive environment
            const isInteractive = process.stdin.isTTY && process.stdout.isTTY;

            let useNewPort: boolean;
            if (isInteractive) {
                useNewPort = await promptUser(
                    `Would you like to start the gRPC server on port ${availableGrpcPort} instead? (y/n): `,
                );
            } else {
                // Non-interactive mode: automatically use available port
                console.log(
                    `Automatically using available gRPC port ${availableGrpcPort} (non-interactive mode)`,
                );
                useNewPort = true;
            }

            if (useNewPort) {
                await configManager.setgrpcPort(availableGrpcPort);
                console.log(
                    `gRPC server will start on port ${availableGrpcPort}`,
                );
            } else {
                console.log('Exiting...');
                process.exit(1);
            }
        }

        // Create APP instance
        const app = express();
        const httpServer = createServer(app);

        // Enable CORS for all routes (needed for external Python clients)
        app.use(
            cors({
                origin: '*', // Allow all origins
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization'],
                credentials: false,
            }),
        );

        // Initialize the database
        await initializeDatabase(config.database);

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
                // Support various protobuf and JSON content types
                type: [
                    'application/x-protobuf',
                    'application/vnd.google.protobuf',
                    'application/protobuf',
                    'application/json',
                    'application/octet-stream', // Some clients send protobuf as octet-stream
                ],
                limit: '10mb',
            }),
            otelRouter,
        );

        // Initialize SocketManager
        SocketManager.init(httpServer);

        // Initialize and start gRPC server on a separate port
        // Use environment variable if set, otherwise use config (which may have been updated after port conflict resolution)
        const finalGrpcPort = configManager.getConfig().grpcPort;
        const otelGrpcServer = new OtelGrpcServer();
        try {
            await otelGrpcServer.start(finalGrpcPort);
            console.debug(`gRPC server started on port ${finalGrpcPort}`);
        } catch (error) {
            console.warn(
                `[OTEL gRPC] Failed to start gRPC server on port ${finalGrpcPort}, ` +
                    'traces will be received via HTTP endpoint /v1/traces:',
                error instanceof Error ? error.message : error,
            );
        }

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
            displayBanner(
                APP_INFO.name,
                APP_INFO.version,
                actualPort,
                config.database.database,
                mode,
            );

            if (process.env.NODE_ENV === 'production') {
                opener(`http://localhost:${actualPort}/home`);
            }
        });

        return { httpServer, otelGrpcServer };
    } catch (error) {
        console.error('Error initializing server:', error);
        console.error('Error stack:', (error as Error).stack);
        throw error;
    }
}

// Set up the server and start listening
initializeServer()
    .then(({ httpServer, otelGrpcServer }) => {
        // Handle graceful shutdown
        const cleanup = async () => {
            console.debug('Closing Socket.IO connections');
            SocketManager.close();

            console.debug('Stopping gRPC server');
            try {
                await otelGrpcServer.stop();
            } catch (error) {
                console.error('Error stopping gRPC server:', error);
                otelGrpcServer.forceShutdown();
            }

            console.debug('Closing HTTP server');
            httpServer.close(() => {
                console.debug('HTTP server closed');
                process.exit(0);
            });
        };

        process.on('SIGTERM', cleanup);
        process.on('SIGINT', cleanup);
    })
    .catch(() => {
        process.exit(1);
    });
