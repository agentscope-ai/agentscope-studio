import { Attributes, SpanStatus } from '@opentelemetry/api';
import {
    OldSpanKind,
    SpanData,
    SpanEvent,
    SpanLink,
    SpanResource,
    SpanScope,
} from '../../../shared/src/types/trace';
import {
    getNestedValue,
    unflattenObject,
} from '../../../shared/src/utils/objectUtils';
import {
    decodeUnixNano,
    getTimeDifferenceNano,
} from '../../../shared/src/utils/timeUtils';

export class SpanProcessor {
    public static validateOTLPSpan(span: unknown): boolean {
        try {
            const spanObj = span as Record<string, unknown>;
            if (!spanObj.trace_id || !spanObj.span_id || !spanObj.name) {
                console.error('[SpanProcessor] Missing required span fields');
                return false;
            }

            if (!spanObj.start_time_unix_nano || !spanObj.end_time_unix_nano) {
                console.error('[SpanProcessor] Missing span time fields');
                return false;
            }

            if (
                isNaN(Number(spanObj.start_time_unix_nano)) ||
                isNaN(Number(spanObj.end_time_unix_nano))
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
        span: unknown,
        resource: SpanResource,
        scope: SpanScope,
    ): SpanData {
        // Sdk-handled data attributes
        const spanObj = span as Record<string, unknown>;
        const traceId = this.decodeIdentifier(
            spanObj.trace_id as Uint8Array | string | undefined,
        );
        const spanId = this.decodeIdentifier(
            spanObj.span_id as Uint8Array | string | undefined,
        );
        const parentId = spanObj.parent_span_id
            ? this.decodeIdentifier(
                spanObj.parent_span_id as Uint8Array | string | undefined,
            )
            : undefined;
        const startTimeUnixNano = decodeUnixNano(
            spanObj.start_time_unix_nano as
            | string
            | number
            | { toNumber?: () => number; low?: number; high?: number }
            | null
            | undefined,
        );
        const endTimeUnixNano = decodeUnixNano(
            spanObj.end_time_unix_nano as
            | string
            | number
            | { toNumber?: () => number; low?: number; high?: number }
            | null
            | undefined,
        );

        // The self-calculated attributes
        const attributesArray = spanObj.attributes;
        const decodedAttributes = this.unflattenAttributes(
            this.loadJsonStrings(
                this.decodeKeyValues(
                    Array.isArray(attributesArray) ? attributesArray : [],
                ),
            ),
        );
        // Cast to Attributes - the unflattened object should match OpenTelemetry Attributes type
        let attributes = decodedAttributes as unknown as Attributes;

        // Detect and convert old protocol format to new format
        const spanName = typeof spanObj.name === 'string' ? spanObj.name : '';
        const newValues = this.convertOldProtocolToNew(attributes, {
            name: spanName,
        });
        const span_name = newValues.span_name;
        attributes = newValues.attributes as unknown as Attributes;

        console.debug('[SpanProcessor] new attributes', attributes);

        const eventsArray = spanObj.events;
        const events: SpanEvent[] = Array.isArray(eventsArray)
            ? eventsArray.map((event) => this.decodeEvent(event))
            : [];
        const linksArray = spanObj.links;
        const links: SpanLink[] = Array.isArray(linksArray)
            ? linksArray.map((link) => this.decodeLink(link))
            : [];

        const status = this.decodeStatus(
            spanObj.status as { code?: number; message?: string } | undefined,
        );

        return {
            traceId: traceId,
            spanId: spanId,
            traceState:
                typeof spanObj.trace_state === 'string'
                    ? spanObj.trace_state
                    : undefined,
            parentSpanId: parentId,
            flags:
                typeof spanObj.flags === 'number' ? spanObj.flags : undefined,
            name: span_name,
            kind: typeof spanObj.kind === 'number' ? spanObj.kind : 0,
            startTimeUnixNano: startTimeUnixNano,
            endTimeUnixNano: endTimeUnixNano,
            attributes: attributes,
            droppedAttributesCount:
                typeof spanObj.dropped_attributes_count === 'number'
                    ? spanObj.dropped_attributes_count
                    : 0,
            events: events,
            droppedEventsCount:
                typeof spanObj.dropped_events_count === 'number'
                    ? spanObj.dropped_events_count
                    : 0,
            links: links,
            droppedLinksCount:
                typeof spanObj.dropped_links_count === 'number'
                    ? spanObj.dropped_links_count
                    : 0,
            status: status,
            resource: resource,
            scope: scope,
            runId: this.getRunId(attributes),
            latencyNs: getTimeDifferenceNano(
                startTimeUnixNano,
                endTimeUnixNano,
            ),
        } as SpanData;
    }

    private static getAttributeValue(
        attributes: Record<string, unknown> | undefined,
        key: string | string[],
        separator: string = '.',
    ): unknown {
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
        const oldRunId = this.getAttributeValue(attributes, 'project.run_id');
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
        span: { name?: string },
    ): { span_name: string; attributes: Record<string, unknown> } {
        if (!attributes || typeof attributes !== 'object') {
            return attributes || {};
        }

        // Check if already in new format by looking for gen_ai attributes
        if (this.getAttributeValue(attributes, 'gen_ai')) {
            // Already in new format, but might have mixed old and new attributes
            // Continue to convert any remaining old format attributes
            return { span_name: span.name || '', attributes };
        }

        const newAttributes: Record<string, unknown> = {
            gen_ai: {
                conversation: {},
                request: {},
                operation: {},
            },
            agentscope: {
                function: {
                    input: {},
                    metadata: {},
                    output: {},
                },
            },
        } as Record<string, unknown>;

        const genAi = newAttributes.gen_ai as Record<string, unknown>;
        const conversation = genAi.conversation as Record<string, unknown>;
        const operation = genAi.operation as Record<string, unknown>;
        const agentscope = newAttributes.agentscope as Record<string, unknown>;
        const agentscopeFunction = agentscope.function as Record<
            string,
            unknown
        >;

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
        const outputValue = this.getAttributeValue(attributes, 'output') as
            | Record<string, unknown>
            | undefined;
        if (outputValue) {
            agentscopeFunction.output = outputValue;
            if (outputValue.usage && typeof outputValue.usage === 'object') {
                if (!genAi.usage) {
                    genAi.usage = {};
                }
                const usage = genAi.usage as Record<string, unknown>;
                usage.input_tokens = (
                    outputValue.usage as Record<string, unknown>
                ).input_tokens;
                usage.output_tokens = (
                    outputValue.usage as Record<string, unknown>
                ).output_tokens;
            }
        }

        let span_name = span.name || '';
        const metadataObj = metadataValue as
            | Record<string, unknown>
            | undefined;
        if (span_kind === OldSpanKind.AGENT) {
            operation.name = 'invoke_agent';
            span_name =
                operation.name + ' ' + ((metadataObj?.name as string) || '');
        } else if (span_kind === OldSpanKind.TOOL) {
            operation.name = 'execute_tool';
            span_name =
                operation.name + ' ' + ((metadataObj?.name as string) || '');
        } else if (span_kind === OldSpanKind.LLM) {
            operation.name = 'chat';
            span_name =
                operation.name +
                ' ' +
                ((metadataObj?.model_name as string) || '');
        } else if (span_kind === OldSpanKind.EMBEDDING) {
            operation.name = 'embedding';
            span_name =
                operation.name +
                ' ' +
                ((metadataObj?.model_name as string) || '');
        } else if (span_kind === OldSpanKind.FORMATTER) {
            operation.name = 'format';
        } else {
            operation.name = 'unknown';
        }

        return { span_name, attributes: newAttributes };
    }

    private static decodeIdentifier(
        identifier: Uint8Array | string | undefined,
    ): string {
        if (!identifier) return '';
        if (typeof identifier === 'string') return identifier;
        return Buffer.from(identifier).toString('hex');
    }

    private static decodeKeyValues(
        keyValues: unknown[],
    ): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const kv of keyValues) {
            const kvObj = kv as Record<string, unknown>;
            if (kvObj.key && kvObj.value) {
                result[String(kvObj.key)] = this.decodeAnyValue(kvObj.value);
            }
        }
        return result;
    }

    private static decodeAnyValue(value: unknown): unknown {
        const valueObj = value as Record<string, unknown>;
        if (valueObj.bool_value !== false && valueObj.bool_value !== undefined)
            return valueObj.bool_value;
        if (valueObj.int_value !== 0 && valueObj.int_value !== undefined)
            return valueObj.int_value;
        if (valueObj.double_value !== 0 && valueObj.double_value !== undefined)
            return valueObj.double_value;
        if (valueObj.string_value !== '' && valueObj.string_value !== undefined)
            return valueObj.string_value;
        const arrayValue = valueObj.array_value as
            | { values?: unknown[] }
            | undefined;
        if (arrayValue?.values) {
            return arrayValue.values.map((v: unknown) =>
                this.decodeAnyValue(v),
            );
        }

        const kvlistValue = valueObj.kvlist_value as
            | { values?: unknown[] }
            | undefined;
        if (kvlistValue?.values) {
            return this.decodeKeyValues(kvlistValue.values);
        }

        if (
            valueObj.bytes_value &&
            typeof valueObj.bytes_value === 'object' &&
            Object.keys(valueObj.bytes_value).length > 0
        ) {
            return valueObj.bytes_value;
        }

        if (valueObj.int_value !== undefined) return valueObj.int_value;
        if (valueObj.double_value !== undefined) return valueObj.double_value;
        if (valueObj.string_value !== undefined) return valueObj.string_value;
        if (valueObj.bool_value !== undefined) return valueObj.bool_value;
        return null;
    }

    private static decodeStatus(status?: {
        code?: number;
        message?: string;
    }): SpanStatus {
        if (!status) {
            return { code: 0, message: '' }; // UNSET
        }

        return {
            code: status.code || 0,
            message: status.message || '',
        };
    }

    private static decodeEvent(event: unknown): SpanEvent {
        const eventObj = event as Record<string, unknown>;
        const attributesArray = eventObj.attributes;
        return {
            name: typeof eventObj.name === 'string' ? eventObj.name : '',
            time: decodeUnixNano(
                eventObj.time_unix_nano as
                | string
                | number
                | { toNumber?: () => number; low?: number; high?: number }
                | null
                | undefined,
            ),
            attributes: this.unflattenAttributes(
                this.loadJsonStrings(
                    this.decodeKeyValues(
                        Array.isArray(attributesArray) ? attributesArray : [],
                    ),
                ),
            ) as Attributes,
            droppedAttributesCount:
                typeof eventObj.dropped_attributes_count === 'number'
                    ? eventObj.dropped_attributes_count
                    : 0,
        };
    }

    private static decodeLink(link: unknown): SpanLink {
        const linkObj = link as Record<string, unknown>;
        const attributesArray = linkObj.attributes;
        return {
            traceId: this.decodeIdentifier(
                linkObj.trace_id as Uint8Array | string | undefined,
            ),
            spanId: this.decodeIdentifier(
                linkObj.span_id as Uint8Array | string | undefined,
            ),
            traceState:
                typeof linkObj.trace_state === 'string'
                    ? linkObj.trace_state
                    : undefined,
            flags:
                typeof linkObj.flags === 'number' ? linkObj.flags : undefined,
            attributes: this.unflattenAttributes(
                this.loadJsonStrings(
                    this.decodeKeyValues(
                        Array.isArray(attributesArray) ? attributesArray : [],
                    ),
                ),
            ) as Attributes,
            droppedAttributesCount:
                typeof linkObj.dropped_attributes_count === 'number'
                    ? linkObj.dropped_attributes_count
                    : 0,
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

    private static decodeResource(resource: unknown): SpanResource {
        const resourceObj = resource as Record<string, unknown>;
        const attributesArray = resourceObj.attributes;
        const attributes = this.unflattenAttributes(
            this.loadJsonStrings(
                this.decodeKeyValues(
                    Array.isArray(attributesArray) ? attributesArray : [],
                ),
            ),
        ) as Attributes;

        return {
            attributes: attributes,
            schemaUrl:
                typeof resourceObj.schema_url === 'string'
                    ? resourceObj.schema_url
                    : undefined,
        };
    }

    private static decodeScope(scope: unknown): SpanScope {
        const scopeObj = scope as Record<string, unknown>;
        const attributesArray = scopeObj.attributes;
        const attributes = this.unflattenAttributes(
            this.loadJsonStrings(
                this.decodeKeyValues(
                    Array.isArray(attributesArray) ? attributesArray : [],
                ),
            ),
        ) as Attributes;

        return {
            name: typeof scopeObj.name === 'string' ? scopeObj.name : '',
            version:
                typeof scopeObj.version === 'string'
                    ? scopeObj.version
                    : undefined,
            attributes: attributes,
            schemaUrl:
                typeof scopeObj.schema_url === 'string'
                    ? scopeObj.schema_url
                    : undefined,
        };
    }

    public static safeDecodeOTLPSpan(
        span: unknown,
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

    public static batchProcessOTLPTraces(resourceSpans: unknown[]): SpanData[] {
        const spans: SpanData[] = [];
        try {
            for (const resourceSpan of resourceSpans) {
                const resourceSpanObj = resourceSpan as Record<string, unknown>;
                // Decode resource
                if (!resourceSpanObj.resource) {
                    continue;
                }
                const resource = this.decodeResource(resourceSpanObj.resource);

                // console.debug('[SpanProcessor] resource', resource);
                const scopeSpansArray = resourceSpanObj.scope_spans;
                if (!Array.isArray(scopeSpansArray)) {
                    continue;
                }
                for (const scopeSpan of scopeSpansArray) {
                    const scopeSpanObj = scopeSpan as Record<string, unknown>;
                    // Decode instrumentation scope
                    if (!scopeSpanObj.scope) {
                        continue;
                    }
                    const scope = this.decodeScope(scopeSpanObj.scope);
                    // console.debug('[SpanProcessor] scope', scope);
                    const spansArray = scopeSpanObj.spans;
                    if (!Array.isArray(spansArray)) {
                        continue;
                    }

                    for (const span of spansArray) {
                        const processedSpan = SpanProcessor.safeDecodeOTLPSpan(
                            span,
                            resource,
                            scope,
                        );
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
