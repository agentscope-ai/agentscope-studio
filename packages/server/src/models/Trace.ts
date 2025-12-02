import { BaseEntity, Column, Entity, Index, PrimaryColumn } from 'typeorm';

// Span table - optimized for trace listing and filtering
@Entity()
@Index(['traceId'])
@Index(['spanId'])
@Index(['parentSpanId'])
@Index(['startTimeUnixNano'])
@Index(['statusCode'])
@Index(['latencyNs'])
@Index(['serviceName'])
@Index(['operationName'])
@Index(['instrumentationName'])
@Index(['model'])
@Index(['inputTokens'])
@Index(['outputTokens'])
@Index(['totalTokens'])
@Index(['conversationId'])
export class SpanTable extends BaseEntity {
    @PrimaryColumn({ nullable: false })
    id: string;

    @Column()
    traceId: string;

    @Column()
    spanId: string;

    @Column({ nullable: true })
    traceState?: string;

    @Column({ nullable: true })
    parentSpanId?: string;

    @Column({ nullable: true })
    flags?: number;

    @Column()
    name: string;

    @Column()
    kind: number; // SpanKind enum value (OpenTelemetry API enum)

    @Column()
    startTimeUnixNano: string;

    @Column()
    endTimeUnixNano: string;

    @Column('json')
    attributes: Record<string, unknown>;

    @Column({ nullable: true })
    droppedAttributesCount?: number;

    @Column('json', { nullable: true })
    events?: Record<string, unknown>[];

    @Column({ nullable: true })
    droppedEventsCount?: number;

    @Column('json', { nullable: true })
    links?: Record<string, unknown>[];

    @Column({ nullable: true })
    droppedLinksCount?: number;

    @Column('json')
    status: Record<string, unknown>;

    // Resource information
    @Column('json')
    resource: Record<string, unknown>;

    // InstrumentationScope information
    @Column('json')
    scope: Record<string, unknown>;

    // Status code
    @Column({ nullable: true })
    statusCode?: number;

    // Resource.service.name
    @Column({ nullable: true })
    serviceName?: string;

    // Attributes.gen_ai.operation.name
    @Column({ nullable: true })
    operationName?: string;

    // InstrumentationScope.name
    @Column({ nullable: true })
    instrumentationName?: string;

    // InstrumentationScope.version
    @Column({ nullable: true })
    instrumentationVersion?: string;

    // Attributes.gen_ai.request.model
    @Column({ nullable: true })
    model?: string;

    // Attributes.gen_ai.usage.input_token
    @Column({ nullable: true })
    inputTokens?: number;

    // Attributes.gen_ai.usage.output_token
    @Column({ nullable: true })
    outputTokens?: number;

    // Attributes.gen_ai.usage.total_token
    @Column({ nullable: true })
    totalTokens?: number;

    // GenAI conversation ID
    @Column({ nullable: true })
    conversationId?: string;

    // Latency in nanoseconds
    @Column('float')
    latencyNs: number;
}
