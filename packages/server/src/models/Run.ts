import { BaseEntity, Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Status } from '../../../shared/src/types/messageForm';
import { InputRequestTable } from '../models/InputRequest';
import { ReplyTable } from '../models/Reply';
import { SpanTable } from './Trace';

@Entity()
export class RunTable extends BaseEntity {
    @PrimaryColumn()
    id: string;

    @Column()
    project: string;

    @Column()
    name: string;

    @Column()
    timestamp: string;

    @Column()
    run_dir: string;

    @Column()
    pid: number;

    @Column({ type: 'varchar', enum: Status, default: Status.DONE })
    status: Status;

    @OneToMany(() => ReplyTable, (reply) => reply.runId)
    replies: ReplyTable[];

    @OneToMany(() => SpanTable, (span) => span.conversationId)
    spans: SpanTable[];

    @OneToMany(() => InputRequestTable, (inputRequest) => inputRequest.runId)
    inputRequests: InputRequestTable[];
}
