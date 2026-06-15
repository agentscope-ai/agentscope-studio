/**
 * Convert SpanData to OTLP JSON format (ExportTraceServiceRequest).
 * See: https://opentelemetry.io/docs/specs/otlp/
 */

import type { SpanData, SpanEvent, SpanLink, SpanResource, SpanScope } from '../types/trace';

type OtlpAnyValue =
    | { stringValue: string }
    | { boolValue: boolean }
    | { intValue: string }
    | { doubleValue: number }
    | { arrayValue: { values: OtlpAnyValue[] } }
    | { kvlistValue: { values: OtlpKeyValue[] } };

type OtlpKeyValue = { key: string; value: OtlpAnyValue };

function encodeAnyValue(value: unknown): OtlpAnyValue {
    if (value === null || value === undefined) {
        return { stringValue: '' };
    }
    if (typeof value === 'string') {
        return { stringValue: value };
    }
    if (typeof value === 'boolean') {
        return { boolValue: value };
    }
    if (typeof value === 'number') {
        if (Number.isInteger(value) && !Number.isNaN(value)) {
            return { intValue: String(value) };
        }
        return { doubleValue: value };
    }
    if (Array.isArray(value)) {
        return {
            arrayValue: {
                values: value.map((v) => encodeAnyValue(v)),
            },
        };
    }
    if (typeof value === 'object' && value !== null) {
        const entries = Object.entries(value as Record<string, unknown>);
        return {
            kvlistValue: {
                values: entries.map(([k, v]) => ({
                    key: k,
                    value: encodeAnyValue(v),
                })),
            },
        };
    }
    return { stringValue: String(value) };
}

function encodeAttributes(attrs: Record<string, unknown> | undefined): OtlpKeyValue[] {
    if (!attrs || typeof attrs !== 'object') return [];
    return Object.entries(attrs).map(([key, val]) => ({
        key,
        value: encodeAnyValue(val),
    }));
}

function ensureHexId(id: string | undefined, length: number): string {
    if (!id) return '0'.repeat(length);
    const hex = id.replace(/^0x/i, '').replace(/\s/g, '');
    if (hex.length >= length) return hex.slice(0, length);
    return hex.padStart(length, '0');
}

function encodeEvent(event: SpanEvent): Record<string, unknown> {
    return {
        name: event.name || '',
        time_unix_nano: event.time || '0',
        attributes: encodeAttributes(event.attributes as Record<string, unknown>),
        dropped_attributes_count: event.droppedAttributesCount ?? 0,
    };
}

function encodeLink(link: SpanLink): Record<string, unknown> {
    return {
        trace_id: ensureHexId(link.traceId, 32),
        span_id: ensureHexId(link.spanId, 16),
        trace_state: link.traceState ?? '',
        flags: link.flags ?? 0,
        attributes: encodeAttributes(link.attributes as Record<string, unknown>),
        dropped_attributes_count: link.droppedAttributesCount ?? 0,
    };
}

function resourceScopeKey(resource: SpanResource, scope: SpanScope): string {
    return JSON.stringify({
        res: resource?.attributes ?? {},
        scopeName: scope?.name ?? '',
        scopeVersion: scope?.version ?? '',
    });
}

type OtlpScopeSpan = {
    scope: { name: string; version?: string };
    spans: Record<string, unknown>[];
};

type OtlpResourceSpan = {
    resource: { attributes: OtlpKeyValue[]; schemaUrl?: string };
    scopeSpans: OtlpScopeSpan[];
};

export interface ExportTraceServiceRequest {
    resourceSpans: OtlpResourceSpan[];
}

export function spansToOtlpJson(spans: SpanData[]): ExportTraceServiceRequest {
    const groups = new Map<
        string,
        { resource: SpanResource; scope: SpanScope; spans: SpanData[] }
    >();

    for (const span of spans) {
        const resource = span.resource ?? { attributes: {} };
        const scope = span.scope ?? { name: '', version: '' };
        const key = resourceScopeKey(resource, scope);
        let group = groups.get(key);
        if (!group) {
            group = { resource, scope, spans: [] };
            groups.set(key, group);
        }
        group.spans.push(span);
    }

    const resourceSpans = Array.from(groups.values()).map(({ resource, scope, spans }) => {
        const otlpSpans = spans.map((span) => ({
            trace_id: ensureHexId(span.traceId, 32),
            span_id: ensureHexId(span.spanId, 16),
            parent_span_id: span.parentSpanId
                ? ensureHexId(span.parentSpanId, 16)
                : undefined,
            trace_state: span.traceState ?? '',
            name: span.name ?? '',
            kind: span.kind ?? 0,
            start_time_unix_nano: span.startTimeUnixNano ?? '0',
            end_time_unix_nano: span.endTimeUnixNano ?? '0',
            attributes: encodeAttributes(span.attributes as Record<string, unknown>),
            dropped_attributes_count: span.droppedAttributesCount ?? 0,
            events: (span.events ?? []).map(encodeEvent),
            dropped_events_count: span.droppedEventsCount ?? 0,
            links: (span.links ?? []).map(encodeLink),
            dropped_links_count: span.droppedLinksCount ?? 0,
            status: {
                code: span.status?.code ?? 0,
                message: span.status?.message ?? '',
            },
        }));

        return {
            resource: {
                attributes: encodeAttributes(resource.attributes as Record<string, unknown>),
                schemaUrl: resource.schemaUrl,
            },
            scopeSpans: [
                {
                    scope: {
                        name: scope.name ?? '',
                        version: scope.version,
                    },
                    spans: otlpSpans,
                },
            ],
        };
    });

    return { resourceSpans };
}
