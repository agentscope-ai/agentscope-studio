import {
    BaseEntity,
    Column,
    DataSource,
    ViewColumn,
    ViewEntity,
} from 'typeorm';
import { ContentBlocks } from '../../../shared/src';

@ViewEntity({
    expression: (dataSource: DataSource) => {
        const dialect = dataSource.options.type;

        const jsonArrayAgg = (() => {
            switch (dialect) {
                case 'better-sqlite3':
                    // SQLite
                    return `(
                SELECT json_group_array(json(content))
                FROM (
                    SELECT content 
                    FROM friday_app_message_table
                    WHERE reply_id = r.id
                    ORDER BY timestamp ASC
                )
            )`;
                default:
                    throw new Error(`Unsupported database type: ${dialect}`);
            }
        })();

        return dataSource
            .createQueryBuilder()
            .select('r.id', 'id')
            .addSelect('m.name', 'name')
            .addSelect('m.role', 'role')
            .addSelect(`${jsonArrayAgg}`, 'content')
            .addSelect('r.startTimeStamp', 'startTimeStamp')
            .addSelect('r.endTimeStamp', 'endTimeStamp')
            .addSelect('r.finished', 'finished')
            .from('friday_app_reply_table', 'r')
            .leftJoin('friday_app_message_table', 'm', 'm.reply_id = r.id')
            .groupBy('r.id');
    },
})
export class FridayAppReplyView extends BaseEntity {
    @ViewColumn()
    id: string;

    @ViewColumn()
    name: string;

    @ViewColumn()
    role: string;

    @ViewColumn({
        transformer: {
            from: (value) => {
                // Convert JSON string to ContentBlocks
                return (JSON.parse(value) as ContentBlocks[]).reduce(
                    (acc, block) => {
                        acc.push(...block);
                        return acc;
                    },
                    [] as ContentBlocks,
                );
            },
            to: (value: ContentBlocks) => {
                // Convert ContentBlocks to JSON string
                return JSON.stringify(value);
            },
        },
    })
    content: ContentBlocks;

    @Column()
    startTimeStamp: string;

    @Column({ nullable: true })
    endTimeStamp: string;

    @Column()
    finished: boolean;
}
