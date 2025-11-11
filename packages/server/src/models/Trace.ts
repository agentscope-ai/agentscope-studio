import { BaseEntity, Column, Entity, Index, PrimaryColumn } from 'typeorm';

// Span table - optimized for trace listing and filtering
@Entity()
@Index(['traceId']) // 用于按traceId查询
@Index(['spanId']) // 用于按spanId查询
@Index(['parentSpanId']) // 用于构建span树结构
@Index(['startTimeUnixNano']) // 用于时间范围查询
@Index(['statusCode']) // 用于状态过滤
@Index(['latencyNs']) // 用于性能分析
@Index(['serviceName']) // 用于按服务名过滤
@Index(['operationName']) // 用于按操作名过滤
@Index(['instrumentationName']) // 用于按instrumentation过滤
@Index(['model']) // 用于按模型过滤
@Index(['inputTokens']) // 用于token统计
@Index(['outputTokens']) // 用于token统计
@Index(['totalTokens']) // 用于token统计
@Index(['runId']) // 用于按runId过滤
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
