import {
    BaseEntity,
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
} from 'typeorm';
import { RunTable } from './Run';

@Entity()
export class InputRequestTable extends BaseEntity {
    @PrimaryColumn({ nullable: false })
    requestId: string;

    @Column()
    agentId: string;

    @Column()
    agentName: string;

    @Column('json', { nullable: true })
    structuredInput: Record<string, unknown> | null;

    // Keep the foreign-key value available without requiring the relation to
    // be explicitly loaded. The previous model used `runId` as the relation
    // property itself, so a normal findOne() returned runId as undefined.
    @Column({ name: 'run_id' })
    runId: string;

    @ManyToOne(() => RunTable, (run) => run.inputRequests, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'run_id' })
    run: RunTable;
}
