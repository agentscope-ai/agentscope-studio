import { Attributes, SpanStatus } from '@opentelemetry/api';
import {
    SpanData,
    SpanEvent,
    SpanLink,
    SpanResource,
    SpanScope
} from '../../../shared/src/types/trace';
import {
    getNestedValue,
    unflattenObject,
} from '../../../shared/src/utils/objectUtils';
import { getTimeDifferenceNano } from '../../../shared/src/utils/timeUtils';


export class SpanProcessor {
    public static validateOTLPSpan(span: any): boolean {
        try {
            if (!span.trace_id || !span.span_id || !span.name) {
                console.error('[SpanProcessor] Missing required span fields');
                return false;
            }

            if (!span.start_time_unix_nano || !span.end_time_unix_nano) {
                console.error('[SpanProcessor] Missing span time fields');
                return false;
            }

            if (
                isNaN(Number(span.start_time_unix_nano)) ||
                isNaN(Number(span.end_time_unix_nano))
            ) {
                console.error('[SpanProcessor] Invalid timestamp format');
                return false;
            }

            return true;
        } catch (error) {
            console.error('[SpanProcessor] Validation error:', error);
            return false;
        }
    }

    public static decodeOTLPSpan(
        span: any,
        resource: SpanResource,
        scope: SpanScope,
    ): SpanData {
        // Sdk-handled data attributes
        // console.debug('[SpanProcessor] span', span);
        const traceId = this.decodeIdentifier(span.trace_id);
        const spanId = this.decodeIdentifier(span.span_id);
        const parentId = span.parent_span_id ? this.decodeIdentifier(span.parent_span_id) : undefined;
        const startTimeUnixNano = this.decodeUnixNano(span.start_time_unix_nano);
        const endTimeUnixNano = this.decodeUnixNano(span.end_time_unix_nano);

        // The self-calculated attributes
        const attributes = this.unflattenAttributes(
            this.loadJsonStrings(this.decodeKeyValues(span.attributes)),
        ) as Attributes;
        const events: SpanEvent[] = Array.isArray(span.events)
            ? span.events.map((event: any) => this.decodeEvent(event))
            : [];
        const links: SpanLink[] = Array.isArray(span.links)
            ? span.links.map((link: any) => this.decodeLink(link))
            : [];

        const status = this.decodeStatus(span.status);

        return {
            traceId: traceId,
            spanId: spanId,
            traceState: span.trace_state,
            parentSpanId: parentId,
            flags: span.flags,
            name: span.name,
            kind: span.kind,
            startTimeUnixNano: startTimeUnixNano,
            endTimeUnixNano: endTimeUnixNano,
            attributes: attributes,
            droppedAttributesCount: span.dropped_attributes_count || 0,
            events: events,
            droppedEventsCount: span.dropped_events_count || 0,
            links: links,
            droppedLinksCount: span.dropped_links_count || 0,
            status: status,
            resource: resource,
            scope: scope,
            runId: this.getRunId(attributes),
            latencyNs: getTimeDifferenceNano(startTimeUnixNano, endTimeUnixNano),
        } as SpanData;
    }

    private static getAttributeValue(
        attributes: Record<string, unknown> | undefined,
        key: string | string[],
        separator: string = '.',
    ): any {
        return getNestedValue(attributes, key, separator);
    }


    private static getRunId(attributes: Record<string, unknown>): string {
        return this.getAttributeValue(
            attributes,
            'gen_ai.conversation.id',
        ) || 'unknown';
    }

    private static decodeIdentifier(
        identifier: Uint8Array | string | undefined,
    ): string {
        if (!identifier) return '';
        if (typeof identifier === 'string') return identifier;
        return Buffer.from(identifier).toString('hex');
    }

    private static decodeUnixNano(timeUnixNano: string | number | any | null): string {
        if (timeUnixNano === null || timeUnixNano === undefined) {
            return '0';
        }

        if (typeof timeUnixNano === 'number') {
            return timeUnixNano.toString();
        }

        if (typeof timeUnixNano === 'string') {
            return timeUnixNano;
        }

        // Handle Long type from protobuf
        if (timeUnixNano && typeof timeUnixNano === 'object') {
            // Check if it's a Long object with toNumber method
            if (typeof timeUnixNano.toNumber === 'function') {
                return timeUnixNano.toNumber().toString();
            }
            // Check if it's a Long object with low/high properties
            if (typeof timeUnixNano.low === 'number' && typeof timeUnixNano.high === 'number') {
                // Convert Long to number (this might lose precision for very large numbers)
                const value = timeUnixNano.low + (timeUnixNano.high * 0x100000000);
                return value.toString();
            }
        }

        return '0';
    }

    private static decodeUnixNanoToNumber(timeUnixNano: string | number | any | null): number {
        if (timeUnixNano === null || timeUnixNano === undefined) {
            return 0;
        }

        if (typeof timeUnixNano === 'number') {
            return timeUnixNano;
        }

        if (typeof timeUnixNano === 'string') {
            return parseInt(timeUnixNano, 10);
        }

        // Handle Long type from protobuf
        if (timeUnixNano && typeof timeUnixNano === 'object') {
            // Check if it's a Long object with toNumber method
            if (typeof timeUnixNano.toNumber === 'function') {
                return timeUnixNano.toNumber();
            }
            // Check if it's a Long object with low/high properties
            if (typeof timeUnixNano.low === 'number' && typeof timeUnixNano.high === 'number') {
                // Convert Long to number (this might lose precision for very large numbers)
                return timeUnixNano.low + (timeUnixNano.high * 0x100000000);
            }
        }

        return 0;
    }


    private static decodeKeyValues(
        keyValues: any[],
    ): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const kv of keyValues) {
            result[kv.key] = this.decodeAnyValue(kv.value!);
        }
        return result;
    }

    private static decodeAnyValue(value: any): unknown {

        if (value.bool_value !== false) return value.bool_value;
        if (value.int_value !== 0) return value.int_value;
        if (value.double_value !== 0) return value.double_value;
        if (value.string_value !== '') return value.string_value;
        if (value.array_value?.values) {
            return value.array_value.values.map((v: any) =>
                this.decodeAnyValue(v)
            );
        }

        if (value.kvlist_value?.values) {
            return this.decodeKeyValues(value.kvlist_value.values);
        }

        if (value.bytes_value && Object.keys(value.bytes_value).length > 0) {
            return value.bytes_value;
        }

        if (value.int_value !== undefined) return value.int_value;
        if (value.double_value !== undefined) return value.double_value;
        if (value.string_value !== undefined) return value.string_value;
        if (value.bool_value !== undefined) return value.bool_value;
        return null;
    }

    private static decodeStatus(status?: any): SpanStatus {
        if (!status) {
            return { code: 0, message: '' }; // UNSET
        }

        return {
            code: status.code || 0,
            message: status.message || '',
        };
    }

    private static decodeEvent(event: any): SpanEvent {
        return {
            name: event.name || '',
            time: this.decodeUnixNanoToNumber(event.time_unix_nano),
            attributes: this.unflattenAttributes(
                this.loadJsonStrings(this.decodeKeyValues(event.attributes || [])),
            ) as Attributes,
            droppedAttributesCount: event.dropped_attributes_count,
        };
    }

    private static decodeLink(link: any): SpanLink {
        return {
            traceId: this.decodeIdentifier(link.trace_id),
            spanId: this.decodeIdentifier(link.span_id),
            traceState: link.trace_state,
            flags: link.flags,
            attributes: this.unflattenAttributes(
                this.loadJsonStrings(this.decodeKeyValues(link.attributes || [])),
            ) as Attributes,
            droppedAttributesCount: link.dropped_attributes_count,
        };
    }

    private static unflattenAttributes(
        flat: Record<string, unknown>,
    ): Record<string, unknown> {
        return unflattenObject(flat);
    }

    private static loadJsonStrings(
        attributes: Record<string, unknown>,
    ): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(attributes)) {
            if (typeof value === 'string') {
                try {
                    result[key] = JSON.parse(value);
                } catch {
                    result[key] = value;
                }
            } else {
                result[key] = value;
            }
        }
        return result;
    }

    private static decodeResource(
        resource: any,
    ): SpanResource {
        const attributes = this.unflattenAttributes(
            this.loadJsonStrings(this.decodeKeyValues(resource.attributes || [])),
        ) as Attributes;

        return {
            attributes: attributes,
            schemaUrl: resource.schema_url || undefined,
        };
    }

    private static decodeScope(
        scope: any,
    ): SpanScope {
        const attributes = this.unflattenAttributes(
            this.loadJsonStrings(this.decodeKeyValues(scope.attributes || [])),
        ) as Attributes;

        return {
            name: scope.name,
            version: scope.version,
            attributes: attributes,
            schemaUrl: scope.schema_url,
        };
    }


    public static safeDecodeOTLPSpan(
        span: any,
        resource: SpanResource,
        scope: SpanScope,
    ): SpanData | null {
        try {
            if (!this.validateOTLPSpan(span)) {
                return null;
            }
            return this.decodeOTLPSpan(span, resource, scope);
        } catch (error) {
            console.error('[SpanProcessor] Failed to decode span:', error);
            return null;
        }
    }

    public static batchProcessOTLPTraces(
        resourceSpans: any[],
    ): SpanData[] {
        const spans: SpanData[] = [];
        try {
            for (const resourceSpan of resourceSpans) {
                // Decode resource
                const resource = this.decodeResource(resourceSpan.resource);

                // console.debug('[SpanProcessor] resource', resource);
                if (!resourceSpan.scope_spans) {
                    continue;
                }
                for (const scopeSpan of resourceSpan.scope_spans) {
                    // Decode instrumentation scope
                    const scope = this.decodeScope(scopeSpan.scope);
                    // console.debug('[SpanProcessor] scope', scope);
                    if (!scopeSpan.spans) {
                        continue;
                    }

                    for (const span of scopeSpan.spans) {
                        const processedSpan =
                            SpanProcessor.safeDecodeOTLPSpan(span, resource, scope);
                        if (processedSpan) {
                            spans.push(processedSpan);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(
                '[SpanProcessor] Failed to batch process spans:',
                error,
            );
        }
        return spans;
    }
}
