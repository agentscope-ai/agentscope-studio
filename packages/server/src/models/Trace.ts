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
@Index(['runId'])
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

    // Resource information - 直接嵌入，避免JOIN
    @Column('json')
    resource: Record<string, unknown>;

    // InstrumentationScope information - 直接嵌入，避免JOIN
    @Column('json')
    scope: Record<string, unknown>;

    // Status code - 直接嵌入
    @Column({ nullable: true })
    statusCode?: number;

    // 提取的关键字段用于索引和快速查询
    @Column({ nullable: true })
    serviceName?: string; // resource.service.name

    @Column({ nullable: true })
    operationName?: string; // attributes.gen_ai.operation.name

    @Column({ nullable: true })
    instrumentationName?: string; // instrumentationScope.name

    @Column({ nullable: true })
    instrumentationVersion?: string; // instrumentationScope.version

    @Column({ nullable: true })
    model?: string; // attributes.gen_ai.request.model

    @Column({ nullable: true })
    inputTokens?: number; // attributes.gen_ai.usage.input_token

    @Column({ nullable: true })
    outputTokens?: number; // attributes.gen_ai.usage.output_token

    @Column({ nullable: true })
    totalTokens?: number;

    // Additional fields for our application
    @Column({ nullable: true })
    runId?: string;

    @Column('float')
    latencyNs: number;
}
