import {
    BaseEntity,
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryColumn,
} from 'typeorm';
import { RunTable } from '../models/Run';
import { MessageTable } from '../models/Message';

@Entity()
export class ReplyTable extends BaseEntity {
    @PrimaryColumn()
    replyId: string;

    @Column()
    replyRole: string;

    @Column()
    replyName: string;

    @ManyToOne(() => RunTable, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'run_id' })
    runId: string;

    @Column()
    createdAt: string;

    @Column({ type: 'varchar', nullable: true })
    finishedAt: string | null;

    @OneToMany(() => MessageTable, (message) => message.replyId)
    messages: MessageTable[];
}
