import {
    BaseEntity,
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
} from 'typeorm';
import { RunTable } from './Run';
import { ReplyTable } from './Reply';
import { ContentType } from '../../../shared/src/types/messageForm';

@Entity()
export class MessageTable extends BaseEntity {
    @PrimaryColumn({ nullable: false })
    id: string;

    @ManyToOne(() => RunTable, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'run_id' })
    runId: string;

    // replyId 作为外键，关联到 ReplyTable
    // 注意：数据库列名是 replyId（驼峰），保持与现有数据库的命名约定一致
    @ManyToOne(() => ReplyTable, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'replyId' })
    replyId: string;

    @Column('json')
    msg: {
        name: string;
        role: string;
        content: ContentType;
        metadata: object;
        timestamp: string;
    };
}
