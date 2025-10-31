import { Attributes, SpanStatus } from '@opentelemetry/api';
import {
    OldSpanKind,
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
import { decodeUnixNano, getTimeDifferenceNano } from '../../../shared/src/utils/timeUtils';


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
        const startTimeUnixNano = decodeUnixNano(span.start_time_unix_nano);
        const endTimeUnixNano = decodeUnixNano(span.end_time_unix_nano);

        // The self-calculated attributes
        let attributes = this.unflattenAttributes(
            this.loadJsonStrings(this.decodeKeyValues(span.attributes)),
        ) as Attributes;

        // Detect and convert old protocol format to new format
        const newValues = this.convertOldProtocolToNew(attributes, span);
        const span_name = newValues.span_name;
        attributes = newValues.attributes;

        console.log('[SpanProcessor] new attributes', attributes);

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
            name: span_name,
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
        // Try new format first
        const newRunId = this.getAttributeValue(
            attributes,
            'gen_ai.conversation.id',
        );

        if (newRunId) {
            return String(newRunId);
        }
        // Fallback to old format
        const oldRunId = this.getAttributeValue(
            attributes,
            'project.run_id',
        );
        return oldRunId ? String(oldRunId) : 'unknown';
    }

    /**
     * Convert old protocol format attributes to new format
     *
     * Old format -> New format mappings:
     * - project.run_id -> gen_ai.conversation.id
     * - output.usage.* -> gen_ai.usage.*
     * - output.model -> gen_ai.request.model
     * - output.response.* -> gen_ai.response.*
     *
     * @param attributes The attributes object to convert
     * @param span The original span object (for additional context if needed)
     * @returns Converted attributes in new format
     */
    public static convertOldProtocolToNew(
        attributes: Record<string, unknown>,
        span: any,
    ): Record<string, any> {
        if (!attributes || typeof attributes !== 'object') {
            return attributes || {};
        }

        // Check if already in new format by looking for gen_ai attributes
        if (this.getAttributeValue(attributes, 'gen_ai')) {
            // Already in new format, but might have mixed old and new attributes
            // Continue to convert any remaining old format attributes
            return attributes;
        }

        const newAttributes: Record<string, unknown> = {
            'gen_ai': {
                'conversation': {},
                'request': {},
                'operation': {},
            }, 'agentscope': {
                'function': {
                    'input': {},
                    'metadata': {},
                    'output': {}
                }
            }
        } as Record<string, unknown>;

        const genAi = newAttributes.gen_ai as Record<string, unknown>;
        const conversation = genAi.conversation as Record<string, unknown>;
        const request = genAi.request as Record<string, unknown>;
        const operation = genAi.operation as Record<string, unknown>;
        const agentscope = newAttributes.agentscope as Record<string, unknown>;
        const agentscopeFunction = agentscope.function as Record<string, unknown>;

        agentscopeFunction.name = span.name;
        conversation.id = this.getAttributeValue(attributes, 'project.run_id');
        const span_kind = this.getAttributeValue(attributes, 'span.kind');


        // Convert input -> agentscope.function.input
        const inputValue = this.getAttributeValue(attributes, 'input');
        if (inputValue) {
            agentscopeFunction.input = inputValue;
        }

        const metadataValue = this.getAttributeValue(attributes, 'metadata');
        if (metadataValue) {
            agentscopeFunction.metadata = metadataValue;
        }
        const outputValue = this.getAttributeValue(attributes, 'output') as Record<string, unknown> | undefined;
        if (outputValue) {
            agentscopeFunction.output = outputValue;
            if (outputValue.usage && typeof outputValue.usage === 'object') {

                if (!genAi.usage) {
                    genAi.usage = {};
                }
                const usage = genAi.usage as Record<string, unknown>;
                usage.input_tokens = (outputValue.usage as Record<string, unknown>).input_tokens;
                usage.output_tokens = (outputValue.usage as Record<string, unknown>).output_tokens;
            }
        }

        let span_name = span.name;
        if (span_kind === OldSpanKind.AGENT) {
            operation.name = 'invoke_agent';
            span_name = operation.name + ' ' + (metadataValue?.name || '');
        } else if (span_kind === OldSpanKind.TOOL) {
            operation.name = 'execute_tool';
            span_name = operation.name + ' ' + (metadataValue?.name || '');
        } else if (span_kind === OldSpanKind.LLM) {
            operation.name = 'chat';
            span_name = operation.name + ' ' + (metadataValue?.model_name || '');
        } else if (span_kind === OldSpanKind.EMBEDDING) {
            operation.name = 'embedding';
            span_name = operation.name + ' ' + (metadataValue?.model_name || '');
        } else if (span_kind === OldSpanKind.FORMATTER) {
            operation.name = 'format';
        } else {
            operation.name = 'unknown';
        }

        return { 'span_name': span_name, 'attributes': newAttributes };
    }

    private static decodeIdentifier(
        identifier: Uint8Array | string | undefined,
    ): string {
        if (!identifier) return '';
        if (typeof identifier === 'string') return identifier;
        return Buffer.from(identifier).toString('hex');
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
            time: decodeUnixNano(event.time_unix_nano),
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
