import * as grpc from '@grpc/grpc-js';
import { SpanDao } from '../dao/Trace';
import { SocketManager } from '../trpc/socket';
import { opentelemetry } from './opentelemetry/proto/collector/trace/v1/trace_service';
import * as traceProto from './opentelemetry/proto/trace/v1/trace';
import { SpanProcessor } from './processor';

/**
 * gRPC server implementation for OpenTelemetry TraceService
 */
export class OtelGrpcServer {
    private server: grpc.Server;
    private defaultPort: number;

    constructor(defaultPort: number = 4317) {
        this.defaultPort = defaultPort;
        this.server = new grpc.Server();
        this.setupService();
    }

    private setupService(): void {
        // Create TraceService implementation
        const traceServiceImpl = {
            Export: this.handleExport.bind(this),
        };

        // Add the service to the server
        this.server.addService(
            opentelemetry.proto.collector.trace.v1
                .UnimplementedTraceServiceService.definition,
            traceServiceImpl,
        );
    }

    /**
     * Handle Export RPC call
     */
    private async handleExport(
        call: grpc.ServerUnaryCall<
            opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest,
            opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse
        >,
        callback: grpc.sendUnaryData<opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse>,
    ): Promise<void> {
        try {
            console.debug('[OTEL gRPC] Received ExportTraceServiceRequest');

            const request = call.request;
            const resourceSpans = request.resource_spans || [];

            if (resourceSpans.length === 0) {
                console.warn('[OTEL gRPC] Empty resource_spans in request');
                const response =
                    new opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse();
                callback(null, response);
                return;
            }

            // Convert ResourceSpans to plain objects for processing
            const resourceSpansArray = resourceSpans.map(
                (rs: traceProto.opentelemetry.proto.trace.v1.ResourceSpans) =>
                    rs.toObject(),
            );

            // Process spans using the existing processor
            const spans =
                SpanProcessor.batchProcessOTLPTraces(resourceSpansArray);

            // Save spans to the database
            await SpanDao.saveSpans(spans);

            // Broadcast spans to the run room
            SocketManager.broadcastSpanDataToRunRoom(spans);

            console.debug(
                `[OTEL gRPC] Successfully processed ${spans.length} spans`,
            );

            // Create success response
            const response =
                new opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse();
            callback(null, response);
        } catch (error: unknown) {
            console.error('[OTEL gRPC] Error processing traces:', error);
            const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';

            const response =
                new opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse();
            const partialSuccess =
                new opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess();
            partialSuccess.error_message = errorMessage;
            response.partial_success = partialSuccess;

            callback(
                {
                    code: grpc.status.INTERNAL,
                    details: errorMessage,
                    metadata: new grpc.Metadata(),
                },
                response,
            );
        }
    }

    /**
     * Start the gRPC server
     * @param port - Port to bind the server to. If not provided, uses the default port from constructor.
     */
    public start(port?: number): Promise<void> {
        const bindPort = port ?? this.defaultPort;
        return new Promise((resolve, reject) => {
            this.server.bindAsync(
                `0.0.0.0:${bindPort}`,
                grpc.ServerCredentials.createInsecure(),
                (error: Error | null) => {
                    if (error) {
                        console.error(
                            `[OTEL gRPC] Failed to start server on port ${bindPort}:`,
                            error,
                        );
                        reject(error);
                        return;
                    }
                    resolve();
                },
            );
        });
    }

    /**
     * Stop the gRPC server
     */
    public stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server.tryShutdown((error?: Error) => {
                if (error) {
                    console.error(
                        '[OTEL gRPC] Error shutting down server:',
                        error,
                    );
                    reject(error);
                } else {
                    console.debug('[OTEL gRPC] Server stopped');
                    resolve();
                }
            });
        });
    }

    /**
     * Force shutdown the gRPC server
     */
    public forceShutdown(): void {
        this.server.forceShutdown();
        console.debug('[OTEL gRPC] Server force shutdown');
    }
}
