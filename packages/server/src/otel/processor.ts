import {
    SpanData,
    SpanEvent,
    SpanKind,
    SpanAttributes,
    TraceStatus,
} from '../../../shared/src/types/trace';
import {
    decodeUnixNano,
    getTimeDifference,
} from '../../../shared/src/utils/timeUtils';
import {
    getNestedValue,
    unflattenObject,
} from '../../../shared/src/utils/objectUtils';

import { opentelemetry as opentelemetry_trace } from './opentelemetry/proto/trace/v1/trace';
import { opentelemetry as opentelemetry_common } from './opentelemetry/proto/common/v1/common';

type Span = opentelemetry_trace.proto.trace.v1.Span;
type ResourceSpans = opentelemetry_trace.proto.trace.v1.ResourceSpans;
type Event = opentelemetry_trace.proto.trace.v1.Span.Event;
type KeyValue = opentelemetry_common.proto.common.v1.KeyValue;
type AnyValue = opentelemetry_common.proto.common.v1.AnyValue;
type Status = opentelemetry_trace.proto.trace.v1.Status;
const StatusCode = opentelemetry_trace.proto.trace.v1.Status.StatusCode;

interface StatusInfo {
    code: string;
    message: string;
}

export class SpanProcessor {
    public static validateOTLPSpan(span: Span): boolean {
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

    public static decodeOTLPSpan(span: Span): SpanData {
        // Sdk-handled data attributes
        const traceId = this.decodeIdentifier(span.trace_id);
        const spanId = this.decodeIdentifier(span.span_id);
        const parentId = this.decodeIdentifier(span.parent_span_id);
        const startTime = this.decodeUnixNano(span.start_time_unix_nano);
        const endTime = this.decodeUnixNano(span.end_time_unix_nano);

        // The self-calculated attributes
        const latencyMs = this.getTimeDifference(startTime, endTime);
        const attributes = this.unflattenAttributes(
            this.loadJsonStrings(this.decodeKeyValues(span.attributes)),
        );
        const spanKind = this.getSpanKind(attributes);
        const runId = this.getRunId(attributes);
        const events: SpanEvent[] = Array.isArray(span.events)
            ? span.events.map((event: Event) => this.decodeEvent(event))
            : [];

        const status = this.decodeStatus(span.status);

        return {
            id: spanId,
            traceId: traceId,
            parentSpanId: parentId,
            runId: runId,
            name: span.name,
            spanKind: spanKind,
            startTime: startTime,
            endTime: endTime,
            latencyMs: latencyMs,
            attributes: attributes,
            status: status.code,
            statusMessage: status.message,
            events: events,
        } as SpanData;
    }

    private static getAttributeValue(
        attributes: Record<string, unknown> | undefined,
        key: string | string[],
        separator: string = '.',
    ): any {
        return getNestedValue(attributes, key, separator);
    }

    private static getSpanKind(attributes: Record<string, unknown>): SpanKind {
        const kindValue = this.getAttributeValue(
            attributes,
            SpanAttributes.SPAN_KIND,
        );
        if (
            kindValue &&
            Object.values(SpanKind).includes(kindValue as SpanKind)
        ) {
            return kindValue as SpanKind;
        }
        return SpanKind.COMMON;
    }

    private static getRunId(attributes: Record<string, unknown>): string {
        return this.getAttributeValue(
            attributes,
            SpanAttributes.PROJECT_RUN_ID,
        );
    }

    private static decodeIdentifier(
        identifier: Uint8Array | string | undefined,
    ): string {
        if (!identifier) return '';
        if (typeof identifier === 'string') return identifier;
        return Buffer.from(identifier).toString('hex');
    }

    private static decodeUnixNano(timeUnixNano: string | number): string {
        if (typeof timeUnixNano === 'number') {
            timeUnixNano = timeUnixNano.toString();
        }
        return decodeUnixNano(timeUnixNano);
    }

    private static getTimeDifference(
        startTime: string,
        endTime: string,
    ): number {
        return getTimeDifference(startTime, endTime);
    }

    private static convertGenAI2AS(
        attributes: Record<string, unknown>,
    ): Record<string, unknown> {
        if ('gen_ai.span.kind' in attributes) {
            const result = { ...attributes };
            const spanKind: string = (attributes['gen_ai.span.kind'] as string).toUpperCase();
            result[SpanAttributes.SPAN_KIND] = spanKind as SpanKind;
            result[SpanAttributes.PROJECT_RUN_ID] = attributes['gen_ai.conversation.id'];

            if (spanKind === SpanKind.AGENT) {
                result['input.messages'] = attributes['gen_ai.input.messages'];
                result['output.messages'] = attributes['gen_ai.output.messages'];
                result['metadata.id'] = attributes['gen_ai.agent.id'];
                result['metadata.name'] = attributes['gen_ai.agent.name'];
            }else if(spanKind === SpanKind.LLM){
                result['input.messages'] = attributes['gen_ai.input.messages'];
                result['output.messages'] = attributes['gen_ai.output.messages'];
                result['output.usage.input_tokens'] = attributes['gen_ai.usage.input_tokens']
                result['output.usage.output_tokens'] = attributes['gen_ai.usage.output_tokens']
                result['metadata.model_name'] = attributes['gen_ai.request.model'];
            }else if (spanKind === SpanKind.TOOL){
                result['input.tool_call.id'] = attributes['gen_ai.tool.call.id'],
                result['input.tool_call.name'] = attributes['gen_ai.tool.name'],
                result['input.tool_call.input'] = attributes['gen_ai.tool.call.arguments']
                result['output.content'] = attributes['gen_ai.tool.call.result'],
                result['metadata.id'] = attributes['gen_ai.tool.call.id'],
                result['metadata.type']= 'tool_use',
                result['metadata.name'] = attributes['gen_ai.tool.name'],
                result['metadata.input'] = attributes['gen_ai.tool.call.arguments']
            }else if (spanKind === SpanKind.FORMATTER){
                result['input.messages'] = attributes['gen_ai.input.messages'];
                result['output.messages'] = attributes['gen_ai.output.messages'];
                result['metadata'] = {}
            }else{
                result['metadata'] = {}
            }
            return result;

        }
        return attributes;
    }
    private static decodeKeyValues(
        keyValues: KeyValue[],
    ): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const kv of keyValues) {
            result[kv.key] = this.decodeAnyValue(kv.value);
        }
        const as_result = this.convertGenAI2AS(result);
        return as_result;
    }

    private static decodeAnyValue(value: AnyValue): unknown {

        if (value.bool_value !== false) return value.bool_value;
        if (value.int_value !== 0) return value.int_value;
        if (value.double_value !== 0) return value.double_value;
        if (value.string_value !== '') return value.string_value;
        if (value.array_value?.values) {
            return value.array_value.values.map((v: AnyValue) =>
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

    private static decodeStatus(status?: Status): StatusInfo {
        if (!status) {
            return { code: TraceStatus.UNSET, message: '' };
        }

        const statusMap = {
            [StatusCode.STATUS_CODE_UNSET]: TraceStatus.UNSET,
            [StatusCode.STATUS_CODE_OK]: TraceStatus.OK,
            [StatusCode.STATUS_CODE_ERROR]: TraceStatus.ERROR,
        };

        return {
            code: statusMap[status.code] || TraceStatus.UNSET,
            message: status.message || '',
        };
    }

    private static decodeEvent(event: Event): SpanEvent {
        return {
            name: event.name,
            timestamp: this.decodeUnixNano(event.time_unix_nano),
            attributes: this.decodeKeyValues(event.attributes),
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

    public static safeDecodeOTLPSpan(span: Span): SpanData | null {
        try {
            if (!this.validateOTLPSpan(span)) {
                return null;
            }
            return this.decodeOTLPSpan(span);
        } catch (error) {
            console.error('[SpanProcessor] Failed to decode span:', error);
            return null;
        }
    }

    public static batchProcessOTLPTraces(
        resourceSpans: ResourceSpans[],
    ): SpanData[] {
        const spans: SpanData[] = [];
        try {
            for (const resourceSpan of resourceSpans) {
                if (!resourceSpan.scope_spans) {
                    continue;
                }
                for (const scopeSpan of resourceSpan.scope_spans) {
                    if (!scopeSpan.spans) {
                        continue;
                    }

                    for (const span of scopeSpan.spans) {
                        const processedSpan =
                            SpanProcessor.safeDecodeOTLPSpan(span);
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
