import express, { Request, Response } from 'express';

import { promisify } from 'util';
import { gunzip, inflate } from 'zlib';
import { SpanDao } from '../dao/Trace';
import { SocketManager } from '../trpc/socket';
import { opentelemetry } from './opentelemetry/proto/trace/v1/trace';
import { SpanProcessor } from './processor';
const gunzipAsync = promisify(gunzip);
const inflateAsync = promisify(inflate);

const otelRouter = express.Router();

// Request: POST /v1/traces
otelRouter.post('/traces', async (req: Request, res: Response) => {
    try {
        console.debug(
            `[OTEL] Received OpenTelemetry traces request: ${req.method} ${req.path}`,
        );
        console.debug(`[OTEL] Content-Type: ${req.get('content-type')}`);
        console.debug(
            `[OTEL] Content-Encoding: ${req.get('content-encoding')}`,
        );
        console.debug(`[OTEL] Content-Length: ${req.get('content-length')}`);

        const contentType = req.get('content-type') || '';
        const contentEncoding = req.get('content-encoding');

        // Check content-type
        if (
            !contentType ||
            (!contentType.includes('application/x-protobuf') &&
                !contentType.includes('application/json'))
        ) {
            return res.status(415).json({
                error: 'Unsupported Media Type',
                message:
                    'Content-Type must be application/x-protobuf or application/json',
            });
        }

        // Check content-encoding
        if (contentEncoding && !['gzip', 'deflate'].includes(contentEncoding)) {
            return res.status(415).json({
                error: 'Unsupported Content Encoding',
                message: `Unsupported content encoding: ${contentEncoding}`,
            });
        }

        let body = req.body;

        if (!body || body.length === 0) {
            console.error('[OTEL] Empty request body');
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Empty request body',
            });
        }

        // Handle compressed data
        try {
            if (contentEncoding === 'gzip') {
                body = await gunzipAsync(body);
            } else if (contentEncoding === 'deflate') {
                body = await inflateAsync(body);
            }
        } catch (error) {
            console.error('[OTEL] Failed to decompress request body:', error);
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Failed to decompress request body',
            });
        }

        let resourceSpans: unknown;

        // Parse the body based on content type
        if (contentType.includes('application/x-protobuf')) {
            try {
                const traceData =
                    opentelemetry.proto.trace.v1.TracesData.deserializeBinary(
                        body,
                    ).toObject();
                resourceSpans = traceData.resource_spans;
            } catch (error) {
                console.error('[OTEL] Failed to parse protobuf:', error);
                return res.status(422).json({
                    error: 'Unprocessable Entity',
                    message: 'Failed to parse OpenTelemetry protobuf data',
                });
            }
        } else if (contentType.includes('application/json')) {
            try {
                const jsonData = JSON.parse(body.toString());
                resourceSpans = jsonData.resourceSpans;
            } catch (error) {
                console.error('[OTEL] Failed to parse JSON:', error);
                return res.status(422).json({
                    error: 'Unprocessable Entity',
                    message: 'Failed to parse JSON data',
                });
            }
        }

        if (!resourceSpans || !Array.isArray(resourceSpans)) {
            return res.status(422).json({
                error: 'Invalid or missing resourceSpans data',
                message: 'Invalid OpenTelemetry data',
            });
        }

        const spans = SpanProcessor.batchProcessOTLPTraces(resourceSpans);
        // Save spans to the databases
        await SpanDao.saveSpans(spans);
        // Broadcast spans to the run room
        SocketManager.broadcastSpanDataToRunRoom(spans);

        return res.status(200).json({
            message: `Processed traces successfully`,
        });
    } catch (error: unknown) {
        console.error('Error processing OpenTelemetry traces:', error);
        res.status(500);
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error occurred';
        res.statusMessage = errorMessage;
        res.json({
            error: 'Internal Server Error',
            message: 'Failed to process traces',
        });
    }
});

export default otelRouter;
