import { Attributes, SpanKind, SpanStatus } from '@opentelemetry/api';

// Trace status enum
export enum TraceStatus {
    OK = 'OK',
    ERROR = 'ERROR',
}

// Trace data interface
export interface TraceData {
    startTime: string;
    endTime: string;
    latencyNs: number;
    status: TraceStatus;
    runId: string;
}

export type SpanAttributes = Attributes;

// Simplified event interface for SpanData
export interface SpanEvent {
    name: string;
    time: string;
    attributes?: Attributes;
    droppedAttributesCount?: number;
}

export interface SpanLink {
    traceId: string;
    spanId: string;
    traceState?: string;
    flags?: number;
    attributes?: SpanAttributes;
    droppedAttributesCount?: number;
}

export interface SpanResource {
    attributes: SpanAttributes;
    schemaUrl?: string;
}

export interface SpanScope {
    name: string;
    version?: string;
    attributes?: SpanAttributes;
    schemaUrl?: string;
}
// SpanData interface for SpanTable storage

export enum OldSpanKind {
    AGENT = 'AGENT',
    TOOL = 'TOOL',
    LLM = 'LLM',
    EMBEDDING = 'EMBEDDING',
    FORMATTER = 'FORMATTER',
    COMMON = 'COMMON',
}

export interface SpanData {
    // Basic span identification (as strings for easier storage)
    traceId: string;
    spanId: string;
    traceState?: string;
    parentSpanId?: string;
    flags?: number;
    name: string;
    kind: SpanKind;

    // Timing (matching protobuf ISpan types)
    startTimeUnixNano: string;
    endTimeUnixNano: string;

    // Span data (using OpenTelemetry API types)
    attributes: SpanAttributes;
    droppedAttributesCount: number;
    events: SpanEvent[];
    droppedEventsCount: number;
    links: SpanLink[];
    droppedLinksCount: number;
    status: SpanStatus;

    // Resource and scope information from resourceSpans structure
    resource: SpanResource;
    scope: SpanScope;
    runId: string;
    latencyNs: number;
}
