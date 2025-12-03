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
    private static warningPeriodStartTime = Date.now();
    private static readonly WARNING_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

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
        const spanObj = span as Record<string, unknown>;
        const traceId = this.decodeIdentifier(spanObj.trace_id);
        const spanId = this.decodeIdentifier(spanObj.span_id);
        const parentId = spanObj.parent_span_id
            ? this.decodeIdentifier(spanObj.parent_span_id)
            : undefined;
        const startTimeUnixNano = decodeUnixNano(spanObj.start_time_unix_nano);
        const endTimeUnixNano = decodeUnixNano(spanObj.end_time_unix_nano);

        // Decode attributes
        let attributes = this.decodeAttributes(spanObj.attributes);

        let spanName = typeof spanObj.name === 'string' ? spanObj.name : '';
        if (scope.name.toLowerCase().includes('agentscope.tracing._trace')) {
            this.logOldProtocolWarning();

            const newValues = this.convertOldProtocolToNew(attributes, {
                name: spanName,
            });
            spanName = newValues.span_name;
            attributes = newValues.attributes as unknown as Attributes;
        }

        const events = this.decodeArray(spanObj.events, (e) =>
            this.decodeEvent(e),
        );
        const links = this.decodeArray(spanObj.links, (l) =>
            this.decodeLink(l),
        );

        const status = this.decodeStatus(spanObj.status);

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
            name: spanName,
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
            conversationId: this.getConversationId(attributes),
            latencyNs: getTimeDifferenceNano(
                startTimeUnixNano,
                endTimeUnixNano,
            ),
        } as SpanData;
    }

    private static decodeAttributes(attributes: unknown): Attributes {
        const attrs = Array.isArray(attributes) ? attributes : [];
        return this.unflattenAttributes(
            this.loadJsonStrings(this.decodeKeyValues(attrs)),
        ) as unknown as Attributes;
    }

    private static decodeArray<T>(
        value: unknown,
        mapper: (item: unknown) => T,
    ): T[] {
        return Array.isArray(value) ? value.map(mapper) : [];
    }

    private static getConversationId(
        attributes: Record<string, unknown>,
    ): string {
        const conversationId = getNestedValue(
            attributes,
            'gen_ai.conversation.id',
        );
        if (conversationId) return String(conversationId);
        const oldRunId = getNestedValue(attributes, 'project.run_id');
        return oldRunId ? String(oldRunId) : 'unknown';
    }

    /**
     * Log warning about old protocol format.
     * - Within 5 minutes: warn on each detection
     * - After 5 minutes: stop warning
     */
    private static logOldProtocolWarning(): void {
        const now = Date.now();
        const timeSinceStart = now - this.warningPeriodStartTime;
        if (timeSinceStart < this.WARNING_PERIOD_MS) {
            console.warn(
                '[Warning] Agentscope SDK version is too low. Please update to 1.0.9 or higher.',
            );
        }
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
            return { span_name: span.name || '', attributes: attributes || {} };
        }

        // Check if already in new format by looking for gen_ai attributes
        if (getNestedValue(attributes, 'gen_ai')) {
            return { span_name: span.name || '', attributes: attributes };
        }

        const newAttributes: Record<string, unknown> = {
            gen_ai: {
                conversation: {},
                request: {},
                operation: {},
                agent: {},
                tool: {},
            },
            agentscope: {
                function: {
                    input: {},
                    output: {},
                },
            },
        } as Record<string, unknown>;

        const genAi = newAttributes.gen_ai as Record<string, unknown>;
        const conversation = genAi.conversation as Record<string, unknown>;
        const operation = genAi.operation as Record<string, unknown>;
        const agentscope = newAttributes.agentscope as Record<string, unknown>;
        const request = genAi.request as Record<string, unknown>;
        const agent = genAi.agent as Record<string, unknown>;
        const tool = genAi.tool as Record<string, unknown>;
        const agentscopeFunction = agentscope.function as Record<
            string,
            unknown
        >;

        agentscopeFunction.name = span.name;
        conversation.id = getNestedValue(attributes, 'project.run_id');
        const span_kind = getNestedValue(attributes, 'span.kind');

        // Copy input, metadata, output
        const inputValue = getNestedValue(attributes, 'input');
        if (inputValue) agentscopeFunction.input = inputValue;

        const metadataValue = getNestedValue(attributes, 'metadata');

        const outputValue = getNestedValue(attributes, 'output') as
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
            agent.name = (metadataObj?.name as string) || '';
        } else if (span_kind === OldSpanKind.TOOL) {
            operation.name = 'execute_tool';
            span_name =
                operation.name + ' ' + ((metadataObj?.name as string) || '');
            tool.name = (metadataObj?.name as string) || '';
        } else if (span_kind === OldSpanKind.LLM) {
            operation.name = 'chat';
            span_name =
                operation.name +
                ' ' +
                ((metadataObj?.model_name as string) || '');
            request.model = (metadataObj?.model_name as string) || '';
        } else if (span_kind === OldSpanKind.EMBEDDING) {
            operation.name = 'embeddings';
            span_name =
                operation.name +
                ' ' +
                ((metadataObj?.model_name as string) || '');
            request.model = (metadataObj?.model_name as string) || '';
        } else if (span_kind === OldSpanKind.FORMATTER) {
            operation.name = 'format';
            span_name =
                operation.name + ' ' + ((metadataObj?.name as string) || '');
        } else {
            operation.name = 'unknown';
        }

        return { span_name, attributes: newAttributes };
    }

    private static decodeIdentifier(identifier: unknown): string {
        if (!identifier) return '';
        if (typeof identifier === 'string') return identifier;
        if (identifier instanceof Uint8Array) {
            return Buffer.from(identifier).toString('hex');
        }
        return '';
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

    private static decodeStatus(status: unknown): SpanStatus {
        if (!status || typeof status !== 'object') {
            return { code: 0, message: '' }; // UNSET
        }
        const s = status as Record<string, unknown>;
        return {
            code: typeof s.code === 'number' ? s.code : 0,
            message: typeof s.message === 'string' ? s.message : '',
        };
    }

    private static decodeEvent(event: unknown): SpanEvent {
        const e = event as Record<string, unknown>;
        return {
            name: typeof e.name === 'string' ? e.name : '',
            time: decodeUnixNano(e.time_unix_nano),
            attributes: this.decodeAttributes(e.attributes),
            droppedAttributesCount:
                typeof e.dropped_attributes_count === 'number'
                    ? e.dropped_attributes_count
                    : 0,
        };
    }

    private static decodeLink(link: unknown): SpanLink {
        const l = link as Record<string, unknown>;
        return {
            traceId: this.decodeIdentifier(l.trace_id),
            spanId: this.decodeIdentifier(l.span_id),
            traceState:
                typeof l.trace_state === 'string' ? l.trace_state : undefined,
            flags: typeof l.flags === 'number' ? l.flags : undefined,
            attributes: this.decodeAttributes(l.attributes),
            droppedAttributesCount:
                typeof l.dropped_attributes_count === 'number'
                    ? l.dropped_attributes_count
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
        const r = resource as Record<string, unknown>;
        return {
            attributes: this.decodeAttributes(r.attributes),
            schemaUrl:
                typeof r.schema_url === 'string' ? r.schema_url : undefined,
        };
    }

    private static decodeScope(scope: unknown): SpanScope {
        const s = scope as Record<string, unknown>;
        return {
            name: typeof s.name === 'string' ? s.name : '',
            version: typeof s.version === 'string' ? s.version : undefined,
            attributes: this.decodeAttributes(s.attributes),
            schemaUrl:
                typeof s.schema_url === 'string' ? s.schema_url : undefined,
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
            throw error;
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
            throw error;
        }
        return spans;
    }
}
