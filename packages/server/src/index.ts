import * as trpcExpress from '@trpc/server/adapters/express';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import opener from 'opener';
import path from 'path';
import portfinder from 'portfinder';
import { ConfigManager } from '../../shared/src/config';
import { promptUser } from '../../shared/src/utils/terminal';
import { initializeDatabase } from './database';
import { OtelGrpcServer } from './otel/grpc-server';
import otelRouter from './otel/router';
import { appRouter } from './trpc/router';
import { SocketManager } from './trpc/socket';

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

            // In non-interactive environments (like Docker), automatically use the available port
            const isInteractive = process.stdin.isTTY && process.stdout.isTTY;

            if (isInteractive) {
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
            } else {
                // Non-interactive mode (Docker): automatically use available port
                await configManager.setPort(availablePort);
                console.log(
                    `Automatically using available port ${availablePort} (non-interactive mode)`,
                );
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
        // Use OpenTelemetry standard gRPC port (4317) or from environment variable
        const grpcPort = parseInt(process.env.OTEL_GRPC_PORT || '4317', 10);
        const otelGrpcServer = new OtelGrpcServer();
        try {
            await otelGrpcServer.start(grpcPort);
        } catch (error) {
            console.warn(
                `[OTEL gRPC] Failed to start gRPC server on port ${grpcPort}, ` +
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
            console.log(
                `Server running on port ${actualPort} in ${process.env.NODE_ENV} mode ...`,
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
            console.log('Closing Socket.IO connections');
            SocketManager.close();

            console.log('Stopping gRPC server');
            try {
                await otelGrpcServer.stop();
            } catch (error) {
                console.error('Error stopping gRPC server:', error);
                otelGrpcServer.forceShutdown();
            }

            console.log('Closing HTTP server');
            httpServer.close(() => {
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
